import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BookOpen, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  helpful_count: number;
  view_count: number;
  created_at: string;
}

export default function HelpCenter() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchArticles();
    
    // Check if there's a hash in the URL to scroll to specific article
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const article = articles.find(a => a.id === hash);
      if (article) setSelectedArticle(article);
    }
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles');
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const handleArticleClick = async (article: Article) => {
    setSelectedArticle(article);
    
    // Increment view count
    await supabase
      .from('knowledge_base_articles')
      .update({ view_count: article.view_count + 1 })
      .eq('id', article.id);
    
    // Update local state
    setArticles(prev => prev.map(a => 
      a.id === article.id ? { ...a, view_count: a.view_count + 1 } : a
    ));
  };

  const handleMarkHelpful = async (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const { error } = await supabase
      .from('knowledge_base_articles')
      .update({ helpful_count: article.helpful_count + 1 })
      .eq('id', articleId);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success('Thank you for your feedback!');
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, helpful_count: a.helpful_count + 1 } : a
      ));
      if (selectedArticle?.id === articleId) {
        setSelectedArticle({ ...selectedArticle, helpful_count: selectedArticle.helpful_count + 1 });
      }
    }
  };

  const categories = ['all', ...new Set(articles.map(a => a.category))];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading help articles...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="mt-2 text-muted-foreground">Browse our knowledge base to find answers to common questions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar with articles list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="w-full flex-wrap h-auto">
                  {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat} className="capitalize flex-1">
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <ScrollArea className="h-[600px] mt-4">
                <div className="space-y-2">
                  {filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No articles found</p>
                    </div>
                  ) : (
                    filteredArticles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => handleArticleClick(article)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${
                          selectedArticle?.id === article.id ? 'border-primary bg-accent/30' : ''
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {article.view_count} views
                          </span>
                        </div>
                        <p className="font-medium text-sm">{article.title}</p>
                        {article.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {article.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Article content */}
        <div className="lg:col-span-2">
          {selectedArticle ? (
            <Card>
              <CardHeader>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {selectedArticle.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedArticle.view_count} views
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {selectedArticle.helpful_count} found helpful
                  </span>
                </div>
                <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">{selectedArticle.content}</p>
                </div>

                {selectedArticle.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {selectedArticle.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-8 rounded-lg border bg-muted/30 p-4">
                  <p className="mb-3 text-sm font-medium">Was this article helpful?</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkHelpful(selectedArticle.id)}
                    className="gap-2"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Yes, this helped
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24">
                <BookOpen className="mb-4 h-16 w-16 text-muted-foreground/40" />
                <h3 className="mb-2 text-lg font-semibold">Select an article</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Choose an article from the list to view its content
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}