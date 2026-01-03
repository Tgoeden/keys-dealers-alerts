import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { historyApi, keyApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Key,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';

const Logs = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await historyApi.getAll();
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filter !== 'all' && item.action !== filter) return false;
    if (searchDate) {
      try {
        const timestamp = item.checked_out_at || item.returned_at || item.moved_at;
        if (!timestamp) return false;
        const itemDate = format(new Date(timestamp), 'yyyy-MM-dd');
        if (!itemDate.includes(searchDate)) return false;
      } catch (e) {
        return false;
      }
    }
    return true;
  });

  const getActionIcon = (action) => {
    switch (action) {
      case 'checkout':
        return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
      case 'return':
        return <ArrowDownRight className="w-4 h-4 text-emerald-400" />;
      case 'bay_move':
        return <Key className="w-4 h-4 text-cyan-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'checkout':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Checked Out</Badge>;
      case 'return':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Returned</Badge>;
      case 'bay_move':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Bay Move</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">Unknown</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Action', 'User', 'Reason', 'Duration (min)', 'Notes'];
    const rows = filteredHistory.map((item) => {
      const date = new Date(item.checked_out_at || item.returned_at || item.moved_at);
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm:ss'),
        item.action,
        item.user_name,
        item.reason || '-',
        item.duration_minutes || '-',
        item.notes || '-',
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyflow-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const todayCheckouts = history.filter(h => {
    try {
      const timestamp = h.checked_out_at || h.returned_at;
      if (!timestamp) return false;
      const date = new Date(timestamp);
      return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && h.action === 'checkout';
    } catch (e) {
      return false;
    }
  }).length;

  const todayReturns = history.filter(h => {
    try {
      if (!h.returned_at) return false;
      const date = new Date(h.returned_at);
      return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && h.action === 'return';
    } catch (e) {
      return false;
    }
  }).length;

  const avgDuration = history
    .filter(h => h.action === 'return' && h.duration_minutes)
    .reduce((acc, h, _, arr) => acc + (h.duration_minutes / arr.length), 0);

  return (
    <Layout>
      <div className="space-y-6" data-testid="logs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Logs & Reports
            </h1>
            <p className="text-slate-400 mt-1">
              View key checkout history and export reports
            </p>
          </div>
          <Button onClick={exportToCSV} className="btn-primary" data-testid="export-btn">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{todayCheckouts}</p>
                  <p className="text-xs text-slate-500">Today's Checkouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{todayReturns}</p>
                  <p className="text-xs text-slate-500">Today's Returns</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{Math.round(avgDuration)} min</p>
                  <p className="text-xs text-slate-500">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-[#111113] border-[#1f1f23] text-white" data-testid="log-filter">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent className="bg-[#111113] border-[#1f1f23]">
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="checkout">Checkouts Only</SelectItem>
              <SelectItem value="return">Returns Only</SelectItem>
              <SelectItem value="bay_move">Bay Moves Only</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-10 bg-[#111113] border-[#1f1f23] text-white"
              data-testid="date-filter"
            />
          </div>
        </div>

        {/* Logs Table */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded" />
                  ))}
                </div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white">No logs found</h3>
                <p className="text-slate-500 mt-1">
                  Key activity will appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">
                        Date/Time
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">
                        Action
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">
                        User
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">
                        Reason
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHistory.slice(0, 100).map((item) => {
                      const timestamp = item.checked_out_at || item.returned_at || item.moved_at;
                      let date;
                      try {
                        date = timestamp ? new Date(timestamp) : new Date();
                      } catch (e) {
                        date = new Date();
                      }
                      return (
                        <tr key={item.id} className="hover:bg-white/5">
                          <td className="p-4">
                            <p className="text-sm text-white">{format(date, 'MMM d, yyyy')}</p>
                            <p className="text-xs text-slate-500">{format(date, 'h:mm a')}</p>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getActionIcon(item.action)}
                              {getActionBadge(item.action)}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-white">{item.user_name}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-400 capitalize">
                              {item.reason?.replace('_', ' ') || '-'}
                              {item.service_bay && ` (Bay ${item.service_bay})`}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-400 font-mono">
                              {item.duration_minutes ? `${item.duration_minutes} min` : '-'}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Logs;
