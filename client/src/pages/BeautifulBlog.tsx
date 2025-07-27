import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEOMeta } from "@/components/ui/seo-meta";
import type { BlogPostWithCategories, BlogCategory } from "@shared/schema";
import { Calendar, Clock, User, ArrowRight, Search, Tag, Eye, Star, BookOpen, Home } from "lucide-react";
import { Link } from "wouter";
import { trackEvent } from '@/lib/analytics';

export default function BeautifulBlog() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['/api/blog/posts'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/blog/categories'],
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = posts.filter((post: BlogPostWithCategories) => {
    const matchesCategory = selectedCategory === 'all' || 
      post.categories.some(cat => cat.slug === selectedCategory);
    const matchesSearch = searchTerm === '' ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = posts.find((post: BlogPostWithCategories) => post.isPinned) || posts[0];
  const regularPosts = filteredPosts.filter((post: BlogPostWithCategories) => post.id !== featuredPost?.id);

  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    trackEvent('blog_category_filter', 'blog', categorySlug);
  };

  const handlePostClick = (postSlug: string) => {
    trackEvent('blog_post_view', 'blog', postSlug);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="text-center space-y-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-96 mx-auto"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto"></div>
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900" data-testid="beautiful-blog-container">
      <SEOMeta 
        title="SmartHire Blog - Recruitment Intelligence & Insights"
        description="Discover the latest insights, trends, and strategies in modern recruitment technology. From AI-powered hiring to data-driven talent acquisition."
        keywords="recruitment, hiring, AI, talent acquisition, HR technology, job matching, CV ranking, applicant tracking"
        url={window.location.href}
        type="website"
      />
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
            
            <Link href="/" className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Home className="h-4 w-4" />
              <span>Back to Platform</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
              <BookOpen className="h-4 w-4 mr-2" />
              SmartHire Insights & Resources
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
              Recruitment
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Intelligence</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Discover the latest insights, trends, and strategies in modern recruitment technology. 
              From AI-powered hiring to data-driven talent acquisition.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="mb-12 space-y-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-2xl border-0 shadow-lg bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 focus:ring-2 focus:ring-purple-500"
              data-testid="search-input"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => handleCategorySelect('all')}
              className="rounded-full px-6 py-2 text-sm font-medium transition-all hover:scale-105"
              data-testid="category-all"
            >
              All Articles
            </Button>
            {categories.map((category: BlogCategory) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.slug ? 'default' : 'outline'}
                onClick={() => handleCategorySelect(category.slug)}
                className="rounded-full px-6 py-2 text-sm font-medium transition-all hover:scale-105"
                data-testid={`category-${category.slug}`}
              >
                <Tag className="h-4 w-4 mr-2" />
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-5 w-5 text-amber-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Article</h2>
            </div>
            
            <Card className="overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group" data-testid="featured-post">
              <div className="lg:flex">
                <div className="lg:w-1/2">
                  {featuredPost.featuredImage ? (
                    <img
                      src={featuredPost.featuredImage}
                      alt={featuredPost.featuredImageAlt || featuredPost.title}
                      className="w-full h-64 lg:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-64 lg:h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-white opacity-50" />
                    </div>
                  )}
                </div>
                <div className="lg:w-1/2 p-8 lg:p-12">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {featuredPost.categories.map((category) => (
                      <Badge key={category.id} variant="secondary" className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        {category.name}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                    {featuredPost.title}
                  </h3>

                  {featuredPost.excerpt && (
                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {featuredPost.author.firstName || featuredPost.author.username}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(featuredPost.createdAt).toLocaleDateString()}
                      </div>
                      {featuredPost.readingTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {featuredPost.readingTime} min read
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/blog/${featuredPost.slug}`}>
                    <Button 
                      className="group-hover:bg-purple-600 group-hover:scale-105 transition-all duration-300 rounded-full px-8"
                      onClick={() => handlePostClick(featuredPost.slug)}
                      data-testid="featured-read-more"
                    >
                      Read Full Article
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Regular Posts Grid */}
        {regularPosts.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
              Latest Articles
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post: BlogPostWithCategories) => (
                <Card 
                  key={post.id} 
                  className="group overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 border-0 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                  data-testid={`post-card-${post.slug}`}
                >
                  <div className="relative">
                    {post.featuredImage ? (
                      <img
                        src={post.featuredImage}
                        alt={post.featuredImageAlt || post.title}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center group-hover:from-purple-500 group-hover:to-blue-600 transition-all duration-500">
                        <BookOpen className="h-12 w-12 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                      {post.categories.slice(0, 2).map((category) => (
                        <Badge key={category.id} className="bg-white/90 text-gray-700 text-xs rounded-full">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {post.author.firstName || post.author.username}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {post.readingTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime}m
                        </div>
                      )}
                    </div>

                    <Link href={`/blog/${post.slug}`}>
                      <Button 
                        variant="outline" 
                        className="w-full rounded-full group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all duration-300"
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`read-more-${post.slug}`}
                      >
                        Read More
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Posts Message */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No articles found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Check back soon for new content!'}
            </p>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="text-center mt-16">
          <Link href="/">
            <Button variant="outline" className="rounded-full px-8 py-3 bg-white/70 backdrop-blur-sm dark:bg-gray-800/70" data-testid="back-to-dashboard">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}