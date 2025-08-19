import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  conversation_id: string;
  escalation_id: string;
  consultant_id: string;
  feedback_type: string;
  rating: number;
  comments: string;
  ai_response_quality: string;
  suggested_improvement: string;
  category_tags: string[];
  created_at: string;
  is_training_data: boolean;
  consultant_profile?: {
    user_id: string;
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

interface FeedbackStats {
  total_feedback: number;
  average_rating: number;
  feedback_by_type: Record<string, number>;
  quality_distribution: Record<string, number>;
  recent_trends: {
    positive_trend: boolean;
    change_percentage: number;
  };
}

export function MessageFeedbackDashboard() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type: string;
    quality: string;
    timeRange: string;
  }>({
    type: 'all',
    quality: 'all',
    timeRange: '7d',
  });

  useEffect(() => {
    fetchFeedbackData();
  }, [filter]);

  const fetchFeedbackData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      switch (filter.timeRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Build query
      let query = supabase
        .from('ai_feedback')
        .select(
          `
          *,
          consultant_profiles!ai_feedback_consultant_id_fkey (
            user_id,
            profiles!consultant_profiles_user_id_fkey (
              first_name,
              last_name
            )
          )
        `,
        )
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (filter.type !== 'all') {
        query = query.eq('feedback_type', filter.type);
      }

      if (filter.quality !== 'all') {
        query = query.eq('ai_response_quality', filter.quality);
      }

      const { data: feedbackData, error } = await query.limit(100);

      if (error) throw error;

      setFeedback(feedbackData || []);

      // Calculate statistics
      if (feedbackData && feedbackData.length > 0) {
        const totalFeedback = feedbackData.length;
        const averageRating =
          feedbackData.filter((f) => f.rating).reduce((sum, f) => sum + f.rating, 0) /
          feedbackData.filter((f) => f.rating).length;

        const feedbackByType = feedbackData.reduce(
          (acc, f) => {
            acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        const qualityDistribution = feedbackData
          .filter((f) => f.ai_response_quality)
          .reduce(
            (acc, f) => {
              acc[f.ai_response_quality] = (acc[f.ai_response_quality] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

        // Calculate trend (comparing with previous period)
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(
          prevStartDate.getDate() - (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const { data: prevData } = await supabase
          .from('ai_feedback')
          .select('rating')
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

        const prevAvgRating =
          prevData && prevData.length > 0
            ? prevData.filter((f) => f.rating).reduce((sum, f) => sum + f.rating, 0) /
              prevData.filter((f) => f.rating).length
            : 0;

        const changePercentage =
          prevAvgRating > 0 ? ((averageRating - prevAvgRating) / prevAvgRating) * 100 : 0;

        setStats({
          total_feedback: totalFeedback,
          average_rating: averageRating || 0,
          feedback_by_type: feedbackByType,
          quality_distribution: qualityDistribution,
          recent_trends: {
            positive_trend: changePercentage >= 0,
            change_percentage: Math.abs(changePercentage),
          },
        });
      } else {
        setStats({
          total_feedback: 0,
          average_rating: 0,
          feedback_by_type: {},
          quality_distribution: {},
          recent_trends: { positive_trend: true, change_percentage: 0 },
        });
      }
    } catch (error) {
      console.error('Error fetching feedback data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTrainingData = async (feedbackId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_feedback')
        .update({ is_training_data: !currentStatus })
        .eq('id', feedbackId);

      if (error) throw error;

      setFeedback((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, is_training_data: !currentStatus } : f)),
      );

      toast({
        title: 'Success',
        description: `Feedback ${!currentStatus ? 'marked' : 'unmarked'} as training data`,
      });
    } catch (error) {
      console.error('Error updating training data status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update training data status',
        variant: 'destructive',
      });
    }
  };

  const getFeedbackTypeColor = (type: string) => {
    const colors = {
      ai_correct: 'bg-green-100 text-green-800',
      ai_incorrect: 'bg-red-100 text-red-800',
      ai_incomplete: 'bg-yellow-100 text-yellow-800',
      ai_unhelpful: 'bg-orange-100 text-orange-800',
      escalation_unnecessary: 'bg-blue-100 text-blue-800',
      escalation_justified: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  const getQualityColor = (quality: string) => {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-green-500',
      average: 'text-yellow-500',
      poor: 'text-orange-500',
      very_poor: 'text-red-500',
    };
    return colors[quality] || 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="mb-2 h-4 w-24 rounded bg-gray-200"></div>
                  <div className="h-8 w-16 rounded bg-gray-200"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Feedback Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and analyze consultant feedback on AI performance
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback Type</label>
              <Select
                value={filter.type}
                onValueChange={(value) => setFilter((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ai_correct">AI Correct</SelectItem>
                  <SelectItem value="ai_incorrect">AI Incorrect</SelectItem>
                  <SelectItem value="ai_incomplete">AI Incomplete</SelectItem>
                  <SelectItem value="ai_unhelpful">AI Unhelpful</SelectItem>
                  <SelectItem value="escalation_unnecessary">Escalation Unnecessary</SelectItem>
                  <SelectItem value="escalation_justified">Escalation Justified</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quality Level</label>
              <Select
                value={filter.quality}
                onValueChange={(value) => setFilter((prev) => ({ ...prev, quality: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualities</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="very_poor">Very Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select
                value={filter.timeRange}
                onValueChange={(value) => setFilter((prev) => ({ ...prev, timeRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Feedback</p>
                  <p className="text-2xl font-bold">{stats.total_feedback}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(stats.average_rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trend</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {stats.recent_trends.change_percentage.toFixed(1)}%
                    </p>
                    {stats.recent_trends.positive_trend ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Correct Responses</p>
                  <p className="text-2xl font-bold">{stats.feedback_by_type.ai_correct || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedback.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No feedback found for the selected criteria
              </div>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getFeedbackTypeColor(item.feedback_type)}>
                          {item.feedback_type.replace('_', ' ')}
                        </Badge>
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{item.rating}</span>
                          </div>
                        )}
                        {item.ai_response_quality && (
                          <span
                            className={`text-sm font-medium ${getQualityColor(item.ai_response_quality)}`}
                          >
                            {item.ai_response_quality}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Submitted by {item.consultant_profile?.profiles?.first_name}{' '}
                        {item.consultant_profile?.profiles?.last_name}
                        on {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant={item.is_training_data ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTrainingData(item.id, item.is_training_data)}
                    >
                      {item.is_training_data ? 'Training Data' : 'Mark for Training'}
                    </Button>
                  </div>

                  {item.comments && (
                    <div>
                      <p className="mb-1 text-sm font-medium">Comments:</p>
                      <p className="text-sm text-muted-foreground">{item.comments}</p>
                    </div>
                  )}

                  {item.suggested_improvement && (
                    <div>
                      <p className="mb-1 text-sm font-medium">Suggested Improvement:</p>
                      <p className="text-sm text-muted-foreground">{item.suggested_improvement}</p>
                    </div>
                  )}

                  {item.category_tags && item.category_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.category_tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
