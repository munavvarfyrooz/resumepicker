import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertBlogPostSchema, insertBlogCategorySchema, type BlogPostWithCategories, type BlogCategory, type InsertBlogPost, type InsertBlogCategory } from "@shared/schema";
import { Plus, Edit, Trash2, Eye, Calendar, User, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

export default function BlogManagement() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [editingPost, setEditingPost] = useState<BlogPostWithCategories | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/blog/posts', selectedStatus === 'all' ? undefined : selectedStatus],
    queryFn: async () => {
      const params = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
      const response = await apiRequest('GET', `/api/blog/posts${params}`);
      return await response.json();
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/blog/categories'],
  });

  const postForm = useForm<InsertBlogPost & { categoryIds?: number[] }>({
    resolver: zodResolver(insertBlogPostSchema.extend({
      categoryIds: insertBlogPostSchema.shape.tags.optional()
    })),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'draft',
      tags: [],
      categoryIds: []
    }
  });

  const categoryForm = useForm<InsertBlogCategory>({
    resolver: zodResolver(insertBlogCategorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: ''
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: InsertBlogPost & { categoryIds?: number[] }) => {
      const response = await apiRequest('POST', '/api/blog/posts', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setShowPostDialog(false);
      postForm.reset();
      trackEvent('blog_post_created', 'blog', 'create_post');
      toast({ title: "Success", description: "Blog post created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create blog post", variant: "destructive" });
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBlogPost> & { categoryIds?: number[] } }) => {
      const response = await apiRequest('PUT', `/api/blog/posts/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setShowPostDialog(false);
      setEditingPost(null);
      postForm.reset();
      trackEvent('blog_post_updated', 'blog', 'update_post');
      toast({ title: "Success", description: "Blog post updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update blog post", variant: "destructive" });
    }
  });

  const publishPostMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/blog/posts/${id}/publish`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      trackEvent('blog_post_published', 'blog', 'publish_post');
      toast({ title: "Success", description: "Blog post published successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish blog post", variant: "destructive" });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/blog/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      trackEvent('blog_post_deleted', 'blog', 'delete_post');
      toast({ title: "Success", description: "Blog post deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete blog post", variant: "destructive" });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertBlogCategory) => {
      const response = await apiRequest('POST', '/api/blog/categories', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/categories'] });
      setShowCategoryDialog(false);
      categoryForm.reset();
      toast({ title: "Success", description: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  });

  const onSubmitPost = (data: InsertBlogPost & { categoryIds?: number[] }) => {
    if (editingPost) {
      updatePostMutation.mutate({ id: editingPost.id, data });
    } else {
      createPostMutation.mutate(data);
    }
  };

  const onSubmitCategory = (data: InsertBlogCategory) => {
    createCategoryMutation.mutate(data);
  };

  const handleEditPost = (post: BlogPostWithCategories) => {
    setEditingPost(post);
    postForm.reset({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      status: post.status,
      tags: post.tags || [],
      categoryIds: post.categories.map(c => c.id)
    });
    setShowPostDialog(true);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    postForm.reset();
    setShowPostDialog(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  return (
    <div className="container mx-auto p-6" data-testid="blog-management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your blog posts and categories</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCategoryDialog(true)} variant="outline" data-testid="button-new-category">
            <Tag className="h-4 w-4 mr-2" />
            New Category
          </Button>
          <Button onClick={handleNewPost} data-testid="button-new-post">
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {postsLoading ? (
        <div className="text-center py-8" data-testid="loading-posts">Loading posts...</div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post: BlogPostWithCategories) => (
            <Card key={post.id} data-testid={`card-post-${post.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author.firstName} {post.author.lastName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                      <Badge variant={post.status === 'published' ? 'default' : post.status === 'draft' ? 'secondary' : 'destructive'}>
                        {post.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditPost(post)} data-testid={`button-edit-${post.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {post.status === 'draft' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => publishPostMutation.mutate(post.id)}
                        data-testid={`button-publish-${post.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deletePostMutation.mutate(post.id)}
                      data-testid={`button-delete-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {post.excerpt && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{post.excerpt}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {post.categories.map((category) => (
                    <Badge key={category.id} variant="outline">
                      {category.name}
                    </Badge>
                  ))}
                  {post.tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {posts.length === 0 && (
            <div className="text-center py-12" data-testid="no-posts">
              <h3 className="text-lg font-medium mb-2">No blog posts found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first blog post to get started</p>
              <Button onClick={handleNewPost}>
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Post Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit' : 'Create'} Blog Post</DialogTitle>
            <DialogDescription>
              {editingPost ? 'Update your blog post details' : 'Create a new blog post with rich content'}
            </DialogDescription>
          </DialogHeader>
          <Form {...postForm}>
            <form onSubmit={postForm.handleSubmit(onSubmitPost)} className="space-y-4">
              <FormField
                control={postForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter post title"
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingPost) {
                            postForm.setValue('slug', generateSlug(e.target.value));
                          }
                        }}
                        data-testid="input-post-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={postForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="post-url-slug" data-testid="input-post-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={postForm.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} placeholder="Brief description of the post" rows={2} data-testid="input-post-excerpt" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={postForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Write your post content here..." rows={10} data-testid="input-post-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={postForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-post-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowPostDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPostMutation.isPending || updatePostMutation.isPending} data-testid="button-save-post">
                  {createPostMutation.isPending || updatePostMutation.isPending ? 'Saving...' : 'Save Post'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new category for organizing blog posts</DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Category name"
                        onChange={(e) => {
                          field.onChange(e);
                          categoryForm.setValue('slug', generateSlug(e.target.value));
                        }}
                        data-testid="input-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="category-slug" data-testid="input-category-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} placeholder="Category description" rows={3} data-testid="input-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending} data-testid="button-save-category">
                  {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}