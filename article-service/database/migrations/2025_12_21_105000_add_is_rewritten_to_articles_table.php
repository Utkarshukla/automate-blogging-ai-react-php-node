<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds is_rewritten flag to track whether an original article has been processed
     * by the AI Rewriter service. This prevents reprocessing the same article.
     */
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->boolean('is_rewritten')->default(false)->after('version');
            $table->index('is_rewritten');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropIndex(['is_rewritten']);
            $table->dropColumn('is_rewritten');
        });
    }
};
