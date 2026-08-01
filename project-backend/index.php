<?php

/**
 * Forward to the true Laravel entry point in public/index.php.
 * This file allows Laravel to run seamlessly on Shared Hosting
 * without requiring document root modifications, bypassing the 404 issue.
 */
require_once __DIR__.'/public/index.php';
