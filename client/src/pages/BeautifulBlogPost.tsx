import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOMeta } from "@/components/ui/seo-meta";
import type { BlogPostWithCategories } from "@shared/schema";
import { Calendar, Clock, User, ArrowLeft, Tag, Eye, Share2, BookOpen, Home } from "lucide-react";
import { trackEvent } from '@/lib/analytics';
import ReactMarkdown from 'react-markdown';

export default function BeautifulBlogPost() {
  const { slug } = useParams();
  
  const { data: post, isLoading, error } = useQuery({
    queryKey: [`/api/blog/posts/slug/${slug}`],
  });

  useEffect(() => {
    if (post) {
      const typedPost = post as BlogPostWithCategories;
      // Track page view
      trackEvent('blog_post_view', 'blog', typedPost.slug);
      
      // Update document title
      document.title = typedPost.metaTitle || `${typedPost.title} | SmartHire Blog`;
    }
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/blog" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">SmartHire Blog</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recruitment Intelligence</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/blog" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                All Articles
              </Link>
              <Link href="/" className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Home className="h-4 w-4" />
                <span>Platform</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Article Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">The article you're looking for doesn't exist or has been removed.</p>
          <Link href="/blog">
            <Button className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const typedPost = post as BlogPostWithCategories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900" data-testid="blog-post-container">
      <SEOMeta 
        title={typedPost.metaTitle || `${typedPost.title} | SmartHire Blog`}
        description={typedPost.metaDescription || typedPost.excerpt || `Read ${typedPost.title} on SmartHire Blog`}
        keywords="recruitment, hiring, AI, talent acquisition, HR technology"
        image={typedPost.featuredImage || undefined}
        url={window.location.href}
        type="article"
        publishedTime={typedPost.publishedAt ? new Date(typedPost.publishedAt).toISOString() : undefined}
        modifiedTime={new Date(typedPost.updatedAt).toISOString()}
        author="SmartHire Team"
      />
      {/* Back Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/blog-view">
          <Button 
            variant="outline" 
            className="rounded-full bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 transition-all"
            data-testid="back-to-blog"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
        </Link>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <article className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-3xl shadow-2xl overflow-hidden" data-testid="article-content">
          {/* Featured Image */}
          {typedPost.featuredImage && (
            <div className="relative">
              <img
                src={typedPost.featuredImage}
                alt={typedPost.featuredImageAlt || typedPost.title}
                className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                data-testid="featured-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
          )}

          <div className="p-8 lg:p-12">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-6">
              {typedPost.categories.map((category) => (
                <Badge 
                  key={category.id} 
                  className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-3 py-1"
                  data-testid={`category-${category.slug}`}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight" data-testid="article-title">
              {typedPost.title}
            </h1>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {typedPost.author.firstName || typedPost.author.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Author</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(typedPost.publishedAt || typedPost.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>

                {typedPost.readingTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{typedPost.readingTime} min read</span>
                  </div>
                )}

                {typedPost.viewCount && typedPost.viewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{typedPost.viewCount} views</span>
                  </div>
                )}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: typedPost.title,
                      text: typedPost.excerpt || 'Check out this article',
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                  trackEvent('blog_post_share', 'blog', typedPost.slug);
                }}
                data-testid="share-button"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Excerpt */}
            {typedPost.excerpt && (
              <div className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8 font-medium italic border-l-4 border-purple-500 pl-6 bg-purple-50 dark:bg-purple-900/20 py-4 rounded-r-lg" data-testid="article-excerpt">
                {typedPost.excerpt}
              </div>
            )}

            {/* Article Content */}
            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-200 prose-a:text-purple-600 dark:prose-a:text-purple-400 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50 dark:prose-blockquote:bg-purple-900/20"
              data-testid="article-body"
            >
              <ReactMarkdown>{typedPost.content}</ReactMarkdown>
            </div>

            {/* Tags */}
            {typedPost.tags && typedPost.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {typedPost.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="rounded-full px-3 py-1 text-sm"
                      data-testid={`tag-${tag}`}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Navigation */}
        <div className="mt-12 text-center">
          <Link href="/blog-view">
            <Button 
              className="rounded-full px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              data-testid="back-to-articles"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Articles
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}