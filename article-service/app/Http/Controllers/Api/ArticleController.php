<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ArticleResource;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

/**
 * Article API Controller
 * 
 * Provides RESTful endpoints for article management.
 * Used by both the frontend (read-only) and AI Rewriter service (write).
 */
class ArticleController extends Controller
{
    /**
     * Get all articles
     * 
     * GET /api/articles
     */
    public function index(Request $request): JsonResponse
    {
        $query = Article::query();

        // Filter by version if provided
        if ($request->has('version')) {
            $query->where('version', $request->version);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $articles = $query->latest('published_at')
                          ->latest('created_at')
                          ->paginate($perPage);

        return response()->json([
            'data' => ArticleResource::collection($articles->items()),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
                'last_page' => $articles->lastPage(),
            ],
        ]);
    }

    /**
     * Get a single article by ID
     * 
     * GET /api/articles/{id}
     */
    public function show($id): JsonResponse
    {
        $article = Article::with(['parent', 'rewrittenVersions'])->findOrFail($id);

        return response()->json([
            'data' => new ArticleResource($article),
        ]);
    }

    /**
     * Get the latest unrewritten article
     * 
     * GET /api/articles/latest
     * Used by AI Rewriter service to fetch the most recent article that hasn't been rewritten yet
     */
    public function latest(): JsonResponse
    {
        $article = Article::unrewritten()
                          ->latest()
                          ->first();

        if (!$article) {
            return response()->json([
                'message' => 'No unrewritten articles found',
            ], 404);
        }

        return response()->json([
            'data' => new ArticleResource($article),
        ]);
    }

    /**
     * Create a new article
     * 
     * POST /api/articles
     * Used by AI Rewriter service to publish rewritten articles
     * Automatically marks the parent article as rewritten when a rewritten version is created
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'source_url' => 'nullable|url|unique:articles,source_url',
            'version' => 'required|in:original,rewritten',
            'parent_article_id' => 'nullable|exists:articles,id',
            'references' => 'nullable|array',
            'references.*' => 'url',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $article = Article::create($validator->validated());

        // Mark parent article as rewritten if this is a rewritten version
        if ($article->version === 'rewritten' && $article->parent_article_id) {
            $parentArticle = Article::find($article->parent_article_id);
            if ($parentArticle) {
                $parentArticle->update(['is_rewritten' => true]);
            }
        }

        return response()->json([
            'message' => 'Article created successfully',
            'data' => new ArticleResource($article),
        ], 201);
    }

    /**
     * Update an existing article
     * 
     * PUT /api/articles/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        $article = Article::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'source_url' => 'sometimes|nullable|url|unique:articles,source_url,' . $id,
            'version' => 'sometimes|required|in:original,rewritten',
            'parent_article_id' => 'sometimes|nullable|exists:articles,id',
            'references' => 'sometimes|nullable|array',
            'references.*' => 'url',
            'published_at' => 'sometimes|nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $article->update($validator->validated());

        return response()->json([
            'message' => 'Article updated successfully',
            'data' => new ArticleResource($article->fresh()),
        ]);
    }

    /**
     * Delete an article
     * 
     * DELETE /api/articles/{id}
     */
    public function destroy($id): JsonResponse
    {
        $article = Article::findOrFail($id);
        $article->delete();

        return response()->json([
            'message' => 'Article deleted successfully',
        ]);
    }
}
