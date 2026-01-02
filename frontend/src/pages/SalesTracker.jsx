import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { salesApi, userApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  TrendingUp,
  Target,
  Calendar,
  Phone,
  Globe,
  Users,
  FileText,
  CalendarCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Award,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const SalesTracker = () => {
  const { user, isOwner, isDealershipAdmin } = useAuth();
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [teamProgress, setTeamProgress] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [users, setUsers] = useState([]);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (isOwner || isDealershipAdmin) {
      fetchUsers();
      fetchTeamProgress();
    }
    setSelectedUserId(user?.id);
  }, [user]);

  useEffect(() => {
    if (selectedUserId) {
      fetchProgress();
      fetchActivities();
    }
  }, [selectedUserId, selectedDate, viewMode]);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll();
      setUsers(res.data.filter(u => u.role !== 'owner'));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await salesApi.getProgress(selectedUserId, currentYear);
      setProgress(res.data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      if (viewMode === 'daily') {
        startDate = format(selectedDate, 'yyyy-MM-dd');
        endDate = startDate;
      } else if (viewMode === 'weekly') {
        startDate = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else {
        startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
      }

      const res = await salesApi.getDailyActivities({
        user_id: selectedUserId,
        start_date: startDate,
        end_date: endDate,
      });
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamProgress = async () => {
    try {
      const res = await salesApi.getTeamProgress(currentYear);
      setTeamProgress(res.data);
    } catch (err) {
      console.error('Failed to fetch team progress:', err);
    }
  };

  const handleSaveGoal = async (data) => {
    try {
      if (progress?.goal) {
        await salesApi.updateGoal(progress.goal.id, data);
      } else {
        await salesApi.createGoal(data);
      }
      toast.success('Sales goal saved successfully');
      setShowGoalModal(false);
      fetchProgress();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save goal');
    }
  };

  const handleSaveActivity = async (data) => {
    try {
      await salesApi.createDailyActivity(data);
      toast.success('Activity saved successfully');
      setShowEntryModal(false);
      fetchActivities();
      fetchProgress();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save activity');
    }
  };

  const navigateDate = (direction) => {
    if (viewMode === 'daily') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
    } else if (viewMode === 'weekly') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 7) : subDays(selectedDate, 7));
    } else {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 30) : subDays(selectedDate, 30));
    }
  };

  const getTodayActivity = () => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    return activities.find(a => a.date === today);
  };

  const getWeeklyTotals = () => {
    return activities.reduce((acc, a) => ({
      leads: acc.leads + (a.leads_walk_in || 0) + (a.leads_phone || 0) + (a.leads_internet || 0),
      writeups: acc.writeups + (a.writeups || 0),
      sales: acc.sales + (a.sales || 0),
      appointments: acc.appointments + (a.appointments_scheduled || 0),
    }), { leads: 0, writeups: 0, sales: 0, appointments: 0 });
  };

  const isViewingOwnProgress = selectedUserId === user?.id;

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-6" data-testid="sales-tracker-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Sales Tracker
            </h1>
            <p className="text-slate-500 mt-1">
              Track your progress towards your yearly goals
            </p>
          </div>
          <div className="flex gap-3">
            {isViewingOwnProgress && (
              <>
                <Button variant="outline" onClick={() => setShowGoalModal(true)} data-testid="set-goal-btn">
                  <Target className="w-4 h-4 mr-2" />
                  {progress?.goal ? 'Edit Goal' : 'Set Goal'}
                </Button>
                <Button onClick={() => setShowEntryModal(true)} data-testid="log-activity-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Activity
                </Button>
              </>
            )}
          </div>
        </div>

        {/* User selector for admins */}
        {(isOwner || isDealershipAdmin) && (
          <div className="flex items-center gap-4">
            <Label>View progress for:</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-64" data-testid="user-selector">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={user?.id}>My Progress</SelectItem>
                {users.filter(u => u.id !== user?.id).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Progress Overview */}
        {progress && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProgressCard
              title="Sales"
              current={progress.total_sales}
              target={progress.goal?.yearly_sales_target || 0}
              percent={progress.sales_progress_percent}
              icon={TrendingUp}
              color="blue"
            />
            <ProgressCard
              title="Leads"
              current={progress.total_leads}
              target={progress.goal?.yearly_leads_target || 0}
              percent={progress.leads_progress_percent}
              icon={Users}
              color="emerald"
            />
            <ProgressCard
              title="Write-ups"
              current={progress.total_writeups}
              target={progress.goal?.yearly_writeups_target || 0}
              percent={progress.writeups_progress_percent}
              icon={FileText}
              color="amber"
            />
            <ProgressCard
              title="Appointments"
              current={progress.total_appointments}
              target={progress.goal?.yearly_appointments_target || 0}
              percent={progress.appointments_progress_percent}
              icon={CalendarCheck}
              color="purple"
            />
          </div>
        )}

        {/* Goal Achievement Probability */}
        {progress?.goal && (
          <Card data-testid="probability-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Goal Achievement Probability</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Based on your current pace • {progress.days_remaining} days remaining
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold font-mono ${
                    progress.goal_achievement_probability >= 80 ? 'text-emerald-600' :
                    progress.goal_achievement_probability >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {progress.goal_achievement_probability}%
                  </div>
                  <p className="text-sm text-slate-500">
                    Projected: {progress.projected_annual_sales} sales
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={progress.goal_achievement_probability} 
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Tracking */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="daily" data-testid="view-daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="view-weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" data-testid="view-monthly">Monthly</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[150px] text-center">
                {viewMode === 'daily' && format(selectedDate, 'MMM d, yyyy')}
                {viewMode === 'weekly' && `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')}`}
                {viewMode === 'monthly' && format(selectedDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="daily">
            <DailyView activity={getTodayActivity()} date={selectedDate} />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyView activities={activities} selectedDate={selectedDate} totals={getWeeklyTotals()} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyView activities={activities} selectedDate={selectedDate} />
          </TabsContent>
        </Tabs>

        {/* Team Progress (Admin view) */}
        {(isOwner || isDealershipAdmin) && teamProgress.length > 0 && (
          <Card data-testid="team-progress-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-slate-400" />
                Team Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamProgress.sort((a, b) => b.progress_percent - a.progress_percent).map((member, i) => (
                  <div key={member.user_id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-200 text-slate-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{member.user_name}</span>
                        <span className="text-sm text-slate-500">
                          {member.total_sales} / {member.sales_target} sales
                        </span>
                      </div>
                      <Progress value={member.progress_percent} className="h-2" />
                    </div>
                    <span className="text-sm font-mono font-medium text-slate-700 w-16 text-right">
                      {member.progress_percent}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Goal Modal */}
      <GoalModal
        open={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSubmit={handleSaveGoal}
        currentGoal={progress?.goal}
        year={currentYear}
      />

      {/* Activity Entry Modal */}
      <ActivityModal
        open={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSubmit={handleSaveActivity}
        date={selectedDate}
        existingActivity={getTodayActivity()}
      />
    </Layout>
  );
};

const ProgressCard = ({ title, current, target, percent, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card className="card-hover" data-testid={`progress-${title.toLowerCase()}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-900">
            {percent.toFixed(0)}%
          </span>
        </div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-lg font-semibold text-slate-900 mt-1">
          {current} <span className="text-slate-400 font-normal">/ {target}</span>
        </p>
        <Progress value={percent} className="h-2 mt-3" />
      </CardContent>
    </Card>
  );
};

const DailyView = ({ activity, date }) => {
  if (!activity) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No activity logged</h3>
          <p className="text-slate-500 mt-1">
            Log your activity for {format(date, 'MMM d, yyyy')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="daily-activity-view">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatBox label="Walk-in Leads" value={activity.leads_walk_in} icon={Users} />
          <StatBox label="Phone Leads" value={activity.leads_phone} icon={Phone} />
          <StatBox label="Internet Leads" value={activity.leads_internet} icon={Globe} />
          <StatBox label="Write-ups" value={activity.writeups} icon={FileText} />
          <StatBox label="Sales" value={activity.sales} icon={TrendingUp} highlight />
          <StatBox label="Appts Scheduled" value={activity.appointments_scheduled} icon={CalendarCheck} />
          <StatBox label="Appts Shown" value={activity.appointments_shown} icon={CalendarCheck} />
        </div>
        {activity.notes && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600">{activity.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatBox = ({ label, value, icon: Icon, highlight }) => (
  <div className={`p-4 rounded-xl ${highlight ? 'bg-blue-50' : 'bg-slate-50'}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${highlight ? 'text-blue-600' : 'text-slate-400'}`} />
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-2xl font-bold font-mono ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>
      {value || 0}
    </p>
  </div>
);

const WeeklyView = ({ activities, selectedDate, totals }) => {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Total Leads</p>
            <p className="text-3xl font-bold font-mono text-slate-900">{totals.leads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Write-ups</p>
            <p className="text-3xl font-bold font-mono text-slate-900">{totals.writeups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Sales</p>
            <p className="text-3xl font-bold font-mono text-blue-600">{totals.sales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Appointments</p>
            <p className="text-3xl font-bold font-mono text-slate-900">{totals.appointments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Day</th>
                <th className="pb-3">Leads</th>
                <th className="pb-3">Write-ups</th>
                <th className="pb-3">Sales</th>
                <th className="pb-3">Appts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayActivity = activities.find(a => a.date === dateStr);
                const leads = (dayActivity?.leads_walk_in || 0) + (dayActivity?.leads_phone || 0) + (dayActivity?.leads_internet || 0);
                
                return (
                  <tr key={dateStr} className="table-row-hover">
                    <td className="py-3 font-medium text-slate-900">
                      {format(day, 'EEE, MMM d')}
                    </td>
                    <td className="py-3 font-mono">{leads || '-'}</td>
                    <td className="py-3 font-mono">{dayActivity?.writeups || '-'}</td>
                    <td className="py-3 font-mono font-semibold text-blue-600">
                      {dayActivity?.sales || '-'}
                    </td>
                    <td className="py-3 font-mono">{dayActivity?.appointments_scheduled || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

const MonthlyView = ({ activities, selectedDate }) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const totals = activities.reduce((acc, a) => ({
    leads: acc.leads + (a.leads_walk_in || 0) + (a.leads_phone || 0) + (a.leads_internet || 0),
    writeups: acc.writeups + (a.writeups || 0),
    sales: acc.sales + (a.sales || 0),
    appointments: acc.appointments + (a.appointments_scheduled || 0),
  }), { leads: 0, writeups: 0, sales: 0, appointments: 0 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Monthly Leads</p>
            <p className="text-3xl font-bold font-mono text-slate-900">{totals.leads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Monthly Write-ups</p>
            <p className="text-3xl font-bold font-mono text-slate-900">{totals.writeups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Monthly Sales</p>
            <p className="text-3xl font-bold font-mono text-blue-600">{totals.sales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Monthly Appointments</p>
            <p className="text-3xl font-bold font-mono text-slate-900">{totals.appointments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 pb-2">
                {day}
              </div>
            ))}
            {/* Padding for first week */}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {monthDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayActivity = activities.find(a => a.date === dateStr);
              const hasSale = dayActivity?.sales > 0;
              
              return (
                <div
                  key={dateStr}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm ${
                    hasSale ? 'bg-blue-100 text-blue-700' :
                    dayActivity ? 'bg-slate-100' : 'bg-slate-50'
                  }`}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                  {hasSale && (
                    <span className="text-xs font-bold">{dayActivity.sales}</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const GoalModal = ({ open, onClose, onSubmit, currentGoal, year }) => {
  const [form, setForm] = useState({
    year: year,
    yearly_sales_target: currentGoal?.yearly_sales_target || '',
    yearly_leads_target: currentGoal?.yearly_leads_target || '',
    yearly_writeups_target: currentGoal?.yearly_writeups_target || '',
    yearly_appointments_target: currentGoal?.yearly_appointments_target || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentGoal) {
      setForm({
        year: currentGoal.year,
        yearly_sales_target: currentGoal.yearly_sales_target,
        yearly_leads_target: currentGoal.yearly_leads_target,
        yearly_writeups_target: currentGoal.yearly_writeups_target,
        yearly_appointments_target: currentGoal.yearly_appointments_target,
      });
    }
  }, [currentGoal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      year: parseInt(form.year),
      yearly_sales_target: parseInt(form.yearly_sales_target) || 0,
      yearly_leads_target: parseInt(form.yearly_leads_target) || 0,
      yearly_writeups_target: parseInt(form.yearly_writeups_target) || 0,
      yearly_appointments_target: parseInt(form.yearly_appointments_target) || 0,
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="goal-modal">
        <DialogHeader>
          <DialogTitle>{currentGoal ? 'Edit' : 'Set'} Yearly Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Sales Target (units) *</Label>
            <Input
              type="number"
              value={form.yearly_sales_target}
              onChange={(e) => setForm({ ...form, yearly_sales_target: e.target.value })}
              placeholder="e.g., 120"
              required
              data-testid="goal-sales-target"
            />
          </div>
          <div className="space-y-2">
            <Label>Leads Target</Label>
            <Input
              type="number"
              value={form.yearly_leads_target}
              onChange={(e) => setForm({ ...form, yearly_leads_target: e.target.value })}
              placeholder="e.g., 2400"
              data-testid="goal-leads-target"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Write-ups Target</Label>
              <Input
                type="number"
                value={form.yearly_writeups_target}
                onChange={(e) => setForm({ ...form, yearly_writeups_target: e.target.value })}
                placeholder="e.g., 600"
              />
            </div>
            <div className="space-y-2">
              <Label>Appointments Target</Label>
              <Input
                type="number"
                value={form.yearly_appointments_target}
                onChange={(e) => setForm({ ...form, yearly_appointments_target: e.target.value })}
                placeholder="e.g., 480"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading} data-testid="goal-submit">
              {loading ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ActivityModal = ({ open, onClose, onSubmit, date, existingActivity }) => {
  const [form, setForm] = useState({
    date: format(date, 'yyyy-MM-dd'),
    leads_walk_in: 0,
    leads_phone: 0,
    leads_internet: 0,
    writeups: 0,
    sales: 0,
    appointments_scheduled: 0,
    appointments_shown: 0,
    other_activities: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      date: format(date, 'yyyy-MM-dd'),
      leads_walk_in: existingActivity?.leads_walk_in || 0,
      leads_phone: existingActivity?.leads_phone || 0,
      leads_internet: existingActivity?.leads_internet || 0,
      writeups: existingActivity?.writeups || 0,
      sales: existingActivity?.sales || 0,
      appointments_scheduled: existingActivity?.appointments_scheduled || 0,
      appointments_shown: existingActivity?.appointments_shown || 0,
      other_activities: existingActivity?.other_activities || '',
      notes: existingActivity?.notes || '',
    });
  }, [date, existingActivity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...form,
      leads_walk_in: parseInt(form.leads_walk_in) || 0,
      leads_phone: parseInt(form.leads_phone) || 0,
      leads_internet: parseInt(form.leads_internet) || 0,
      writeups: parseInt(form.writeups) || 0,
      sales: parseInt(form.sales) || 0,
      appointments_scheduled: parseInt(form.appointments_scheduled) || 0,
      appointments_shown: parseInt(form.appointments_shown) || 0,
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="activity-modal">
        <DialogHeader>
          <DialogTitle>Log Activity - {format(date, 'MMM d, yyyy')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Walk-in Leads</Label>
              <Input
                type="number"
                min="0"
                value={form.leads_walk_in}
                onChange={(e) => setForm({ ...form, leads_walk_in: e.target.value })}
                data-testid="activity-walk-in"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone Leads</Label>
              <Input
                type="number"
                min="0"
                value={form.leads_phone}
                onChange={(e) => setForm({ ...form, leads_phone: e.target.value })}
                data-testid="activity-phone"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Internet Leads</Label>
              <Input
                type="number"
                min="0"
                value={form.leads_internet}
                onChange={(e) => setForm({ ...form, leads_internet: e.target.value })}
                data-testid="activity-internet"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Write-ups/Quotes</Label>
              <Input
                type="number"
                min="0"
                value={form.writeups}
                onChange={(e) => setForm({ ...form, writeups: e.target.value })}
                data-testid="activity-writeups"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sales</Label>
              <Input
                type="number"
                min="0"
                value={form.sales}
                onChange={(e) => setForm({ ...form, sales: e.target.value })}
                className="border-blue-200 focus:border-blue-500"
                data-testid="activity-sales"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Appts Scheduled</Label>
              <Input
                type="number"
                min="0"
                value={form.appointments_scheduled}
                onChange={(e) => setForm({ ...form, appointments_scheduled: e.target.value })}
                data-testid="activity-appts-scheduled"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Appts Shown</Label>
              <Input
                type="number"
                min="0"
                value={form.appointments_shown}
                onChange={(e) => setForm({ ...form, appointments_shown: e.target.value })}
                data-testid="activity-appts-shown"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about today's activities..."
              rows={2}
              data-testid="activity-notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading} data-testid="activity-submit">
              {loading ? 'Saving...' : 'Save Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesTracker;
