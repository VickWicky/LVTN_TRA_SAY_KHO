<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Support\Facades\Log;

class CloudinaryService
{
    protected $cloudinary;

    public function __construct()
    {
        $this->cloudinary = new Cloudinary(env('CLOUDINARY_URL'));
    }

    /**
     * Upload an image to Cloudinary.
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $folder
     * @param string|null $publicId
     * @return string URL of the uploaded image
     */
    public function uploadImage($file, $folder = 'general', $publicId = null)
    {
        $options = [
            'folder' => $folder,
        ];

        if ($publicId) {
            $options['public_id'] = $publicId;
            $options['overwrite'] = true;
        }

        try {
            $result = $this->cloudinary->uploadApi()->upload($file->getRealPath(), $options);
            return $result['secure_url'];
        } catch (\Exception $e) {
            Log::error("Cloudinary Upload Error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete an image from Cloudinary by its URL.
     *
     * @param string $url
     * @return bool
     */
    public function deleteImage($url)
    {
        if (!$url || strpos($url, 'res.cloudinary.com') === false) {
            return false;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (!$path) return false;
        
        $parts = explode('/upload/', $path);
        if (count($parts) < 2) return false;

        $filePath = preg_replace('/^v\d+\//', '', $parts[1]);

        $pathInfo = pathinfo($filePath);
        $dirname = $pathInfo['dirname'] == '.' ? '' : $pathInfo['dirname'] . '/';
        $publicId = $dirname . $pathInfo['filename'];
        
        if (str_starts_with($publicId, './')) {
            $publicId = substr($publicId, 2);
        }

        try {
            $this->cloudinary->uploadApi()->destroy($publicId);
            return true;
        } catch (\Exception $e) {
            Log::error("Cloudinary Delete Error: " . $e->getMessage());
            return false;
        }
    }
}
