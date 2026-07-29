<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminController extends Controller
{
    // Dashboard Stats
    public function dashboardStats(Request $request)
    {
        $range = $request->query('range', '7days'); // 'today', '7days', 'thisMonth', 'thisYear', 'all'
        
        $now = Carbon::now();
        $startDate = null;
        $endDate = $now->copy()->endOfDay();
        $prevStartDate = null;
        $prevEndDate = null;

        switch ($range) {
            case 'today':
                $startDate = $now->copy()->startOfDay();
                $prevStartDate = $now->copy()->subDay()->startOfDay();
                $prevEndDate = $now->copy()->subDay()->endOfDay();
                break;
            case '7days':
                $startDate = $now->copy()->subDays(6)->startOfDay();
                $prevStartDate = $now->copy()->subDays(13)->startOfDay();
                $prevEndDate = $now->copy()->subDays(7)->endOfDay();
                break;
            case 'thisMonth':
                $startDate = $now->copy()->startOfMonth();
                $prevStartDate = $now->copy()->subMonth()->startOfMonth();
                $prevEndDate = $now->copy()->subMonth()->endOfMonth();
                break;
            case 'thisYear':
                $startDate = $now->copy()->startOfYear();
                $prevStartDate = $now->copy()->subYear()->startOfYear();
                $prevEndDate = $now->copy()->subYear()->endOfYear();
                break;
            case 'custom':
                $startDate = $request->query('start_date') ? Carbon::parse($request->query('start_date'))->startOfDay() : $now->copy()->startOfDay();
                $endDate = $request->query('end_date') ? Carbon::parse($request->query('end_date'))->endOfDay() : $now->copy()->endOfDay();
                // Disable trend comparison for custom range by setting prev period to same as current so diff is 0
                $prevStartDate = $startDate;
                $prevEndDate = $startDate;
                break;
            default: // all
                $startDate = Carbon::create(2000, 1, 1);
                $prevStartDate = $startDate;
                $prevEndDate = $startDate;
                break;
        }

        // Current period stats
        $queryRevenue = Order::where(function($query) {
            $query->where('payment_status', 'paid')
                  ->orWhere('order_status', 'completed');
        });
        $queryOrders = Order::query();
        $queryProducts = Product::query();
        $queryUsers = User::query();

        if ($range !== 'all') {
            $queryRevenue->whereBetween('created_at', [$startDate, $endDate]);
            $queryOrders->whereBetween('created_at', [$startDate, $endDate]);
            $queryProducts->whereBetween('created_at', [$startDate, $endDate]);
            $queryUsers->whereBetween('created_at', [$startDate, $endDate]);
        }

        $totalRevenue = $queryRevenue->sum('final_amount');
        $totalOrders = $queryOrders->count();
        $totalProducts = $queryProducts->count();
        $totalUsers = $queryUsers->count();
        
        // Previous period stats for trends
        $prevRevenue = 0; $prevOrders = 0; $prevProducts = 0; $prevUsers = 0;
        if ($range !== 'all') {
            $prevRevenue = Order::where(function($query) {
                $query->where('payment_status', 'paid')
                      ->orWhere('order_status', 'completed');
            })->whereBetween('created_at', [$prevStartDate, $prevEndDate])->sum('final_amount');
            
            $prevOrders = Order::whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();
            $prevProducts = Product::whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();
            $prevUsers = User::whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();
        }

        $calcTrend = function($current, $prev) {
            if ($prev == 0) return $current > 0 ? 100 : 0;
            return round((($current - $prev) / $prev) * 100, 1);
        };

        $trends = [
            'revenue' => $calcTrend($totalRevenue, $prevRevenue),
            'orders' => $calcTrend($totalOrders, $prevOrders),
            'products' => $calcTrend($totalProducts, $prevProducts),
            'users' => $calcTrend($totalUsers, $prevUsers),
        ];

        $recentOrdersQuery = Order::orderBy('created_at', 'desc')->take(5);
        if ($range !== 'all') $recentOrdersQuery->whereBetween('created_at', [$startDate, $endDate]);
        $recentOrders = $recentOrdersQuery->get();

        // Revenue by day (always last 7 days or based on range if smaller, for area chart)
        $areaStartDate = $range === 'today' ? $now->copy()->subDays(6)->startOfDay() : $startDate;
        $areaEndDate = $range === 'all' ? $now->copy()->endOfDay() : $endDate;
        $revenueByDayRecords = Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(final_amount) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->whereBetween('created_at', [$areaStartDate, $areaEndDate])
            ->where(function($query) {
                $query->where('payment_status', 'paid')
                      ->orWhere('order_status', 'completed');
            })
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        $revenueByDay = collect();
        $daysDiff = $areaStartDate->diffInDays($areaEndDate);
        
        if ($daysDiff > 90 || $range === 'all') {
            $revenueByDay = $revenueByDayRecords->values();
        } else {
            $currentDate = $areaStartDate->copy();
            while ($currentDate->lte($areaEndDate)) {
                $dateStr = $currentDate->format('Y-m-d');
                if ($revenueByDayRecords->has($dateStr)) {
                    $revenueByDay->push($revenueByDayRecords->get($dateStr));
                } else {
                    $revenueByDay->push([
                        'date' => $dateStr,
                        'revenue' => 0,
                        'orders' => 0
                    ]);
                }
                $currentDate->addDay();
            }
        }

        // Orders by status
        $statusQuery = Order::select('order_status as name', DB::raw('COUNT(*) as value'));
        if ($range !== 'all') $statusQuery->whereBetween('created_at', [$startDate, $endDate]);
        $ordersByStatus = $statusQuery->groupBy('order_status')->get();

        // Top 5 products
        $topProductsQuery = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('product_variants', 'order_items.variant_id', '=', 'product_variants.id')
            ->join('products', 'product_variants.product_id', '=', 'products.id')
            ->select('products.name', DB::raw('SUM(order_items.quantity) as total_sold'))
            ->where('orders.order_status', '!=', 'cancelled');
        if ($range !== 'all') $topProductsQuery->whereBetween('orders.created_at', [$startDate, $endDate]);
        $topProducts = $topProductsQuery->groupBy('products.id', 'products.name')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get();

        // Revenue by month (for Bar Chart)
        $revenueByMonth = Order::select(
                DB::raw('MONTH(created_at) as m'),
                DB::raw('SUM(final_amount) as revenue')
            )
            ->whereYear('created_at', $now->year)
            ->where(function($query) {
                $query->where('payment_status', 'paid')
                      ->orWhere('order_status', 'completed');
            })
            ->groupBy('m')
            ->orderBy('m', 'asc')
            ->get()
            ->map(function($item) {
                return [
                    'month' => 'Tháng ' . $item->m,
                    'revenue' => (float)$item->revenue
                ];
            });

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_orders' => $totalOrders,
            'total_products' => $totalProducts,
            'total_users' => $totalUsers,
            'trends' => $trends,
            'recent_orders' => $recentOrders,
            'revenue_by_day' => $revenueByDay,
            'revenue_by_month' => $revenueByMonth,
            'orders_by_status' => $ordersByStatus,
            'top_products' => $topProducts,
        ]);
    }
}
