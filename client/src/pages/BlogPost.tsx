import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
  featuredImage?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
    createdAt: string;
  }>;
}

export default function BlogPost() {
  const { slug } = useParams();
  
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [`/api/blog/posts/slug/${slug}`],
    retry: false,
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-0 shadow-md">
            <CardHeader className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Blog Post Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The blog post you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/blog-view" data-testid="button-back-to-blog">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Link>
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <Button asChild variant="outline" className="mb-4">
            <Link href="/blog-view" data-testid="button-back-to-blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <article>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-6">
              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.categories.map((category) => (
                  <Badge key={category.id} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Tag className="w-3 h-3 mr-1" />
                    {category.name}
                  </Badge>
                ))}
              </div>
              
              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                {post.title}
              </h1>
              
              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-xl text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
                  {post.excerpt}
                </p>
              )}
              
              {/* Meta Information */}
              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  <span className="font-medium">{post.author.firstName} {post.author.lastName}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{format(new Date(post.createdAt), 'MMMM dd, yyyy')}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Main Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {post.content}
                </ReactMarkdown>
              </div>
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Tags:</span>
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </article>
      </main>
    </div>
  );
}