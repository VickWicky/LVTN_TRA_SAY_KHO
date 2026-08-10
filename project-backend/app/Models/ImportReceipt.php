<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportReceipt extends Model
{
    protected $guarded = [];
    public const UPDATED_AT = null;

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function batches()
    {
        return $this->hasMany(Batch::class);
    }
}
