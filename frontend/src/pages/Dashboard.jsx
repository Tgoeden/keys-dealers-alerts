import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { statsApi, historyApi, keyApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Key,
  Clock,
  AlertTriangle,
  Users,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
  const { user, isOwner, isDealershipAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [overdueKeys, setOverdueKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, historyRes, overdueRes] = await Promise.all([
        statsApi.getDashboard(),
        historyApi.getAll(),
        historyApi.getOverdue(),
      ]);
      setStats(statsRes.data);
      setRecentActivity(historyRes.data.slice(0, 10));
      setOverdueKeys(overdueRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Keys',
      value: stats?.total_keys || 0,
      icon: Key,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Available',
      value: stats?.available_keys || 0,
      icon: Key,
      color: 'bg-emerald-50 text-emerald-600',
      trend: 'up',
    },
    {
      label: 'Checked Out',
      value: stats?.checked_out_keys || 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Overdue',
      value: stats?.overdue_keys || 0,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      alert: stats?.overdue_keys > 0,
    },
  ];

  if (isOwner) {
    statCards.push({
      label: 'Dealerships',
      value: stats?.total_dealerships || 0,
      icon: Building2,
      color: 'bg-purple-50 text-purple-600',
    });
  }

  if (isOwner || isDealershipAdmin) {
    statCards.push({
      label: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600',
    });
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-8" data-testid="dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 mt-1">
              Here's what's happening with your keys today
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <Card
              key={stat.label}
              className={`card-hover ${stat.alert ? 'border-red-200 bg-red-50/50' : ''}`}
              data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`stat-icon ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  {stat.alert && (
                    <Badge variant="destructive" className="animate-pulse-ring">
                      Alert
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-slate-900 font-mono">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Keys */}
          {overdueKeys.length > 0 && (
            <Card className="border-red-200" data-testid="overdue-keys-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueKeys.slice(0, 5).map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="font-mono font-semibold text-slate-900">
                          #{key.stock_number}
                        </p>
                        <p className="text-sm text-slate-600">{key.vehicle_model}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">
                          +{key.overdue_minutes} min overdue
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {key.current_checkout?.user_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card data-testid="recent-activity-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No recent activity
                  </p>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.action === 'checkout'
                            ? 'bg-amber-100 text-amber-600'
                            : activity.action === 'return'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {activity.action === 'checkout' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : activity.action === 'return' ? (
                          <ArrowDownRight className="w-5 h-5" />
                        ) : (
                          <Key className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {activity.user_name}{' '}
                          <span className="text-slate-500 font-normal">
                            {activity.action === 'checkout'
                              ? 'checked out'
                              : activity.action === 'return'
                              ? 'returned'
                              : 'moved'}{' '}
                            a key
                          </span>
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {activity.reason && `${activity.reason.replace('_', ' ')} • `}
                          {formatDistanceToNow(
                            new Date(activity.checked_out_at || activity.returned_at || activity.moved_at),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats for Sales */}
          <Card data-testid="sales-quick-stats">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                Sales Quick View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-slate-500">
                  Track your sales progress in the{' '}
                  <a href="/sales-tracker" className="text-blue-600 hover:underline">
                    Sales Tracker
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
