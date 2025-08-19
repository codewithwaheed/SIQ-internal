import { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface BillingStats {
  currentMonthEscalations: number;
  lastMonthEscalations: number;
  totalEarnings: number;
  pendingPayouts: number;
  monthlyTarget: number;
}

interface EscalationPayout {
  id: string;
  created_at: string;
  status: string;
  priority: string;
  reason: string | null;
  payout_amount: number;
  client_company: string;
}

export const BillingSummary = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<BillingStats>({
    currentMonthEscalations: 0,
    lastMonthEscalations: 0,
    totalEarnings: 0,
    pendingPayouts: 0,
    monthlyTarget: 5000
  });
  const [escalationPayouts, setEscalationPayouts] = useState<EscalationPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Payout rates per escalation based on priority
  const payoutRates = {
    urgent: 150,
    high: 100,
    medium: 75,
    normal: 50
  };

  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Get current month start and end
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Fetch current month escalations with profile data using manual join
      const { data: currentMonthData, error: currentError } = await supabase
        .from('escalations')
        .select('*')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString())
        .order('created_at', { ascending: false });

      if (currentError) throw currentError;

      // Get profile data for each escalation
      const escalationsWithProfiles = await Promise.all(
        (currentMonthData || []).map(async (escalation) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('user_id', escalation.user_id)
            .single();

          return {
            ...escalation,
            profiles: profileData
          };
        })
      );

      // Fetch last month escalations for comparison
      const { data: lastMonthData, error: lastError } = await supabase
        .from('escalations')
        .select('*')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      if (lastError) throw lastError;

      // Calculate payouts for current month
      const currentMonthPayouts = escalationsWithProfiles.map(escalation => {
        const payoutAmount = payoutRates[escalation.priority as keyof typeof payoutRates] || payoutRates.normal;
        return {
          id: escalation.id,
          created_at: escalation.created_at,
          status: escalation.status,
          priority: escalation.priority,
          reason: escalation.reason,
          payout_amount: payoutAmount,
          client_company: escalation.profiles?.company_name || 'Unknown Company'
        };
      });

      const totalEarnings = currentMonthPayouts.reduce((sum, payout) => sum + payout.payout_amount, 0);
      const pendingPayouts = currentMonthPayouts
        .filter(p => p.status !== 'resolved')
        .reduce((sum, payout) => sum + payout.payout_amount, 0);

      setStats({
        currentMonthEscalations: escalationsWithProfiles.length || 0,
        lastMonthEscalations: lastMonthData?.length || 0,
        totalEarnings,
        pendingPayouts,
        monthlyTarget: 5000
      });

      setEscalationPayouts(currentMonthPayouts);

    } catch (error: any) {
      toast.error('Failed to load billing data');
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Client', 'Reason', 'Priority', 'Status', 'Payout Amount'];
    const csvData = escalationPayouts.map(payout => [
      new Date(payout.created_at).toLocaleDateString(),
      payout.client_company,
      payout.reason || 'General Support',
      payout.priority,
      payout.status,
      `$${payout.payout_amount}`
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing-summary-${new Date().toISOString().slice(0, 7)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV exported successfully');
  };

  const getProgressPercentage = () => {
    return Math.min((stats.totalEarnings / stats.monthlyTarget) * 100, 100);
  };

  const getGrowthPercentage = () => {
    if (stats.lastMonthEscalations === 0) return stats.currentMonthEscalations > 0 ? 100 : 0;
    return ((stats.currentMonthEscalations - stats.lastMonthEscalations) / stats.lastMonthEscalations) * 100;
  };

  if (loading) {
    return (
      <DashboardLayout title="Billing Summary" subtitle="Loading billing information...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Billing Summary" 
      subtitle="Track your escalation payouts and earnings"
    >
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month Escalations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentMonthEscalations}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getGrowthPercentage() >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-success" />
                ) : (
                  <TrendingUp className="mr-1 h-3 w-3 text-destructive rotate-180" />
                )}
                <span className={getGrowthPercentage() >= 0 ? 'text-success' : 'text-destructive'}>
                  {Math.abs(getGrowthPercentage()).toFixed(1)}% vs last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">${stats.totalEarnings}</div>
              <p className="text-xs text-muted-foreground">
                Based on completed escalations
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">${stats.pendingPayouts}</div>
              <p className="text-xs text-muted-foreground">
                From unresolved escalations
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Target</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyTarget}</div>
              <Progress value={getProgressPercentage()} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {getProgressPercentage().toFixed(1)}% achieved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payout Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Rates by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(payoutRates).map(([priority, amount]) => (
                <div key={priority} className="text-center p-4 border rounded-lg">
                  <Badge 
                    className={
                      priority === 'urgent' ? 'bg-destructive' :
                      priority === 'high' ? 'bg-warning' :
                      priority === 'medium' ? 'bg-accent' : 'bg-muted'
                    }
                  >
                    {priority}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">${amount}</div>
                  <p className="text-xs text-muted-foreground">per escalation</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Payouts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              This Month's Escalations
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {escalationPayouts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No escalations this month</p>
            ) : (
              <div className="space-y-4">
                {escalationPayouts.map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge 
                          className={
                            payout.priority === 'urgent' ? 'bg-destructive' :
                            payout.priority === 'high' ? 'bg-warning' :
                            payout.priority === 'medium' ? 'bg-accent' : 'bg-muted'
                          }
                        >
                          {payout.priority}
                        </Badge>
                        <Badge 
                          variant={payout.status === 'resolved' ? 'default' : 'outline'}
                          className={payout.status === 'resolved' ? 'bg-success' : ''}
                        >
                          {payout.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="font-medium">{payout.reason || 'General Support Request'}</p>
                      <p className="text-sm text-muted-foreground">
                        {payout.client_company} • {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-success">${payout.payout_amount}</div>
                      <p className="text-xs text-muted-foreground">
                        {payout.status === 'resolved' ? 'Earned' : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stripe Integration Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payout Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 space-y-4">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Stripe Integration Coming Soon</h3>
                <p className="text-muted-foreground">
                  Direct payout tracking and automated payments will be available once Stripe is integrated.
                </p>
              </div>
              <Button variant="outline" disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                Connect Stripe Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};