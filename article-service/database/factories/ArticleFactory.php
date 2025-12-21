<?php

namespace Database\Factories;

use App\Models\Article;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Article Factory
 * 
 * Used for testing and seeding sample data.
 */
class ArticleFactory extends Factory
{
    protected $model = Article::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = $this->faker->sentence(6);
        
        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'content' => $this->faker->paragraphs(10, true),
            'source_url' => $this->faker->url(),
            'version' => 'original',
            'is_rewritten' => false,
            'parent_article_id' => null,
            'references' => null,
            'published_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }

    /**
     * Indicate that the article is rewritten.
     */
    public function rewritten(): static
    {
        return $this->state(fn (array $attributes) => [
            'version' => 'rewritten',
            'references' => [
                $this->faker->url(),
                $this->faker->url(),
            ],
        ]);
    }
}
