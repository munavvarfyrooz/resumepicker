import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { Link } from "wouter";
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

export default function BlogView() {
  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
    retry: false,
  });

  const publishedPosts = posts.filter(post => post.status === 'published');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SmartHire Blog</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Insights and tips for modern recruitment
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {publishedPosts.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-2xl text-gray-600 dark:text-gray-400">
                No blog posts yet
              </CardTitle>
              <CardDescription className="text-lg">
                Check back soon for insights and tips about recruitment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8">
            {publishedPosts.map((post) => (
              <Card key={post.id} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.categories.map((category) => (
                      <Badge key={category.id} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <Tag className="w-3 h-3 mr-1" />
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Link href={`/blog/${post.slug}`} data-testid={`link-blog-post-${post.id}`}>
                      {post.title}
                    </Link>
                  </CardTitle>
                  
                  <CardDescription className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                    {post.excerpt}
                  </CardDescription>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {post.author.firstName} {post.author.lastName}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-6">
                    <ReactMarkdown>
                      {post.content.length > 500 ? post.content.substring(0, 500) + '...' : post.content}
                    </ReactMarkdown>
                  </div>
                  
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href={`/blog/${post.slug}`} data-testid={`button-read-more-${post.id}`}>
                      Read More
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}