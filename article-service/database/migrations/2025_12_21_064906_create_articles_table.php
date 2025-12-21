<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the articles table with all required fields:
     * - version: enum to distinguish original vs rewritten articles
     * - parent_article_id: links rewritten articles to their originals
     * - references: JSON field for storing reference URLs
     * - source_url: unique to prevent duplicate scraping
     */
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('content');
            $table->string('source_url')->unique()->nullable();
            $table->enum('version', ['original', 'rewritten'])->default('original');
            $table->unsignedBigInteger('parent_article_id')->nullable();
            $table->json('references')->nullable(); // Array of reference URLs
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            // Foreign key constraint for parent-child relationship
            $table->foreign('parent_article_id')
                  ->references('id')
                  ->on('articles')
                  ->onDelete('cascade');

            // Indexes for performance
            $table->index('version');
            $table->index('parent_article_id');
            $table->index('published_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
