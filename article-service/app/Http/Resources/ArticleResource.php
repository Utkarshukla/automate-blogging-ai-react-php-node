<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Article Resource
 * 
 * Transforms Article model into clean JSON response.
 * Ensures consistent API response format.
 */
class ArticleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'source_url' => $this->source_url,
            'version' => $this->version,
            'is_rewritten' => $this->is_rewritten,
            'parent_article_id' => $this->parent_article_id,
            'references' => $this->references ?? [],
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            // Include parent article if loaded
            'parent' => $this->whenLoaded('parent', function () {
                return new ArticleResource($this->parent);
            }),
            // Include rewritten versions if loaded
            'rewritten_versions' => $this->whenLoaded('rewrittenVersions', function () {
                return ArticleResource::collection($this->rewrittenVersions);
            }),
        ];
    }
}
