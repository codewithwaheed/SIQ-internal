import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { UnifiedHeader } from "@/components/ui/unified-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";

const Analytics = () => {
  const [timeframe, setTimeframe] = useState("30d");

  const { data: summary, loading: summaryLoading } = useApi(
    "admin-analytics/summary",
  );
  const { data: trends, loading: trendsLoading } = useApi(
    `admin-analytics/trends?timeframe=${timeframe}`,
  );
  const { data: frameworks, loading: frameworksLoading } = useApi(
    "admin-analytics/frameworks",
  );
  const { data: responseTimes, loading: responseTimesLoading } = useApi(
    "admin-analytics/response-times",
  );
  const { data: recentActivity, loading: activityLoading } = useApi(
    "admin-analytics/activity",
  );
  const { data: systemHealth, loading: healthLoading } = useApi(
    "admin-analytics/system-health",
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-background flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <UnifiedHeader context="dashboard" />

          <main className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                      <TrendingUp className="h-8 w-8" />
                      Analytics Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                      Monitor system performance and user engagement metrics
                    </p>
                  </div>
                  <Select
                    defaultValue="30d"
                    value={timeframe}
                    onValueChange={setTimeframe}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Conversations
                      </CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {summaryLoading ? (
                        <div className="animate-pulse">
                          <div className="h-8 bg-muted rounded w-20 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-24"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {summary?.totalConversations || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-600">+12%</span> from
                            last month
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Users
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {summaryLoading ? (
                        <div className="animate-pulse">
                          <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-20"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {summary?.activeUsers || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-600">+8%</span> from
                            last month
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Avg Response Time
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {summaryLoading ? (
                        <div className="animate-pulse">
                          <div className="h-8 bg-muted rounded w-12 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-20"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {summary?.avgResponseTime || 0}s
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-600">-15%</span> from
                            last month
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Escalation Rate
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {summaryLoading ? (
                        <div className="animate-pulse">
                          <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-20"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {summary?.escalationRate || 0}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-red-600">+2%</span> from last
                            month
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Chat Volume & Escalations</CardTitle>
                      <CardDescription>
                        Monthly conversation trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {trendsLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Bar
                                dataKey="chats"
                                fill="#3b82f6"
                                name="Chats"
                              />
                              <Bar
                                dataKey="escalations"
                                fill="#ef4444"
                                name="Escalations"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Framework Usage Distribution</CardTitle>
                      <CardDescription>
                        Most queried compliance frameworks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {frameworksLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={frameworks || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name} ${value}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {(frameworks || []).map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Response Time Trends</CardTitle>
                      <CardDescription>
                        Average AI response time by day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {responseTimesLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={responseTimes || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip
                                formatter={(value) => [
                                  `${value}s`,
                                  "Response Time",
                                ]}
                              />
                              <Line
                                type="monotone"
                                dataKey="avgTime"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: "#10b981" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>System Health</CardTitle>
                      <CardDescription>
                        Current system status and performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {healthLoading ? (
                        <div className="h-40 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              API Response Time
                            </span>
                            <Badge
                              className={
                                systemHealth?.apiResponseTime === "Healthy"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {systemHealth?.apiResponseTime || "Unknown"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Database Performance
                            </span>
                            <Badge
                              className={
                                systemHealth?.databasePerformance === "Optimal"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {systemHealth?.databasePerformance || "Unknown"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              AI Model Availability
                            </span>
                            <Badge className="bg-green-100 text-green-800">
                              {systemHealth?.aiModelAvailability || "100%"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Vector Search
                            </span>
                            <Badge
                              className={
                                systemHealth?.vectorSearch === "Normal"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {systemHealth?.vectorSearch || "Normal"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Storage Usage
                            </span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {systemHealth?.storageUsage || "68% Used"}
                            </Badge>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest system events and user interactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activityLoading ? (
                        <div className="h-40 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : recentActivity && recentActivity.length > 0 ? (
                        recentActivity.map((activity: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b last:border-b-0"
                          >
                            <div>
                              <p className="text-sm">{activity.event}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.time}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No recent activity
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Analytics;
