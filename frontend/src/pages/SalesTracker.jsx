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
  AlertTriangle,
  CheckCircle,
  Coffee,
  Briefcase,
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
import { Switch } from '../components/ui/switch';
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
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
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
      toast.success('Sales goal saved!');
      setShowGoalModal(false);
      fetchProgress();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save goal');
    }
  };

  const handleSaveActivity = async (data) => {
    try {
      await salesApi.createDailyActivity(data);
      toast.success('Activity logged!');
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

  const getPeriodTotals = () => {
    return activities.reduce((acc, a) => ({
      leads: acc.leads + (a.leads_walk_in || 0) + (a.leads_phone || 0) + (a.leads_internet || 0),
      writeups: acc.writeups + (a.writeups || 0),
      sales: acc.sales + (a.sales || 0),
      appointments: acc.appointments + (a.appointments_scheduled || 0),
      daysWorked: acc.daysWorked + (a.worked !== false ? 1 : 0),
    }), { leads: 0, writeups: 0, sales: 0, appointments: 0, daysWorked: 0 });
  };

  const isViewingOwnProgress = selectedUserId === user?.id;

  return (
    <Layout>
      <div className="space-y-6" data-testid="sales-tracker-page">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Sales Tracker
            </h1>
            <p className="text-slate-400 mt-1 text-sm sm:text-base">
              Track your progress towards your yearly goal
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isViewingOwnProgress && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowGoalModal(true)} 
                  className="border-[#1f1f23] text-white hover:bg-white/10 text-sm px-3 py-2"
                  data-testid="set-goal-btn"
                >
                  <Target className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{progress?.goal ? 'Edit Goal' : 'Set Goal'}</span>
                </Button>
                <Button onClick={() => setShowEntryModal(true)} className="btn-success text-sm px-3 py-2" data-testid="log-activity-btn">
                  <Plus className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Log Activity</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* User selector for admins */}
        {(isOwner || isDealershipAdmin) && (
          <div className="flex items-center gap-4">
            <Label className="text-slate-400">View progress for:</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-64 bg-[#111113] border-[#1f1f23] text-white" data-testid="user-selector">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="bg-[#111113] border-[#1f1f23]">
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

        {/* MAIN GOAL PROGRESS - Prominent */}
        {progress?.goal && (
          <Card className={`bg-gradient-to-br ${progress.on_track ? 'from-emerald-500/10 to-green-500/5 border-emerald-500/30' : 'from-amber-500/10 to-orange-500/5 border-amber-500/30'}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Probability Circle */}
                <div className="flex flex-col items-center justify-center order-1 lg:order-1">
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="50%" cy="50%" r="35%" stroke="#1f1f23" strokeWidth="8" fill="none" />
                      <circle
                        cx="50%" cy="50%" r="35%"
                        stroke={progress.goal_achievement_probability >= 80 ? '#22c55e' : progress.goal_achievement_probability >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 35}`}
                        strokeDashoffset={`${2 * Math.PI * 35 * (1 - progress.goal_achievement_probability / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl sm:text-4xl font-bold ${progress.goal_achievement_probability >= 80 ? 'text-emerald-400' : progress.goal_achievement_probability >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {progress.goal_achievement_probability}%
                      </span>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Chance</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-2 text-center">
                    {progress.on_track ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> On Track!</span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Behind Pace</span>
                    )}
                  </p>
                </div>

                {/* Sales Progress */}
                <div className="flex flex-col justify-center order-2 lg:order-2">
                  <div className="text-center lg:text-left">
                    <p className="text-slate-400 text-sm">Sales This Year</p>
                    <p className="text-3xl sm:text-5xl font-bold text-white">{progress.total_sales} <span className="text-lg sm:text-2xl text-slate-500">/ {progress.goal.yearly_sales_target}</span></p>
                    <div className="mt-3">
                      <Progress value={(progress.total_sales / progress.goal.yearly_sales_target) * 100} className="h-3" />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{progress.sales_needed_remaining} more sales needed</p>
                  </div>
                </div>

                {/* What's Needed */}
                <div className="space-y-3 sm:space-y-4 order-3 lg:order-3">
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">To Hit Your Goal</p>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-cyan-400">{progress.weekly_sales_needed}</p>
                        <p className="text-xs text-slate-500">per week</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-purple-400">{progress.monthly_sales_needed}</p>
                        <p className="text-xs text-slate-500">per month</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Days Remaining</span>
                      <span className="text-white font-mono">{progress.days_remaining}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-400">Your Pace</span>
                      <span className="text-white font-mono">{progress.current_pace_per_day}/day</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-400">Projected Annual</span>
                      <span className={`font-mono ${progress.projected_annual_sales >= progress.goal.yearly_sales_target ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {progress.projected_annual_sales}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Goal Set */}
        {!progress?.goal && !loading && (
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Set Your Yearly Goal</h3>
              <p className="text-slate-400 mb-6">Start tracking your progress by setting a sales target</p>
              <Button onClick={() => setShowGoalModal(true)} className="btn-primary">
                <Target className="w-4 h-4 mr-2" />
                Set My Goal
              </Button>
            </CardContent>
          </Card>
        )}

        {/* YTD Stats */}
        {progress && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Leads" value={progress.total_leads} icon={Users} color="cyan" />
            <StatCard label="Write-ups" value={progress.total_writeups} icon={FileText} color="purple" />
            <StatCard label="Appointments" value={progress.total_appointments} icon={CalendarCheck} color="amber" />
            <StatCard label="Days Worked" value={progress.days_worked} icon={Briefcase} color="emerald" />
          </div>
        )}

        {/* Activity Tracking */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-[#111113] border border-[#1f1f23] w-full sm:w-auto">
              <TabsTrigger value="daily" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-none">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-none">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-1 sm:flex-none">Monthly</TabsTrigger>
            </TabsList>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="border-[#1f1f23] text-white hover:bg-white/10 flex-shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-white min-w-[120px] sm:min-w-[150px] text-center px-2">
                {viewMode === 'daily' && format(selectedDate, 'MMM d, yyyy')}
                {viewMode === 'weekly' && `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')}`}
                {viewMode === 'monthly' && format(selectedDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="border-[#1f1f23] text-white hover:bg-white/10 flex-shrink-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="daily">
            <DailyView activity={getTodayActivity()} date={selectedDate} />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyView activities={activities} selectedDate={selectedDate} totals={getPeriodTotals()} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyView activities={activities} selectedDate={selectedDate} totals={getPeriodTotals()} />
          </TabsContent>
        </Tabs>

        {/* Team Progress */}
        {(isOwner || isDealershipAdmin) && teamProgress.length > 0 && (
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Award className="w-5 h-5 text-amber-400" />
                Team Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamProgress.sort((a, b) => b.total_sales - a.total_sales).map((member, i) => (
                  <div key={member.user_id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-slate-500/20 text-slate-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-white/10 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{member.user_name}</p>
                      <p className="text-xs text-slate-500">{member.total_sales} / {member.sales_target} sales</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{member.progress_percent}%</p>
                    </div>
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

const StatCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    cyan: 'bg-cyan-500/20 text-cyan-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <Card className="bg-[#111113] border-[#1f1f23]">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-2xl font-bold text-white truncate">{value}</p>
            <p className="text-xs text-slate-500 truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DailyView = ({ activity, date }) => {
  if (!activity) {
    return (
      <Card className="bg-[#111113] border-[#1f1f23]">
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">No activity logged</h3>
          <p className="text-slate-500 mt-1">Log your activity for {format(date, 'MMM d, yyyy')}</p>
        </CardContent>
      </Card>
    );
  }

  const totalLeads = (activity.leads_walk_in || 0) + (activity.leads_phone || 0) + (activity.leads_internet || 0);

  return (
    <Card className="bg-[#111113] border-[#1f1f23]">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {activity.worked !== false ? (
            <span className="flex items-center gap-1 text-sm text-emerald-400"><Briefcase className="w-4 h-4" /> Work Day</span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-amber-400"><Coffee className="w-4 h-4" /> Day Off</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-xs text-slate-500 uppercase">Total Leads</p>
            <p className="text-2xl font-bold text-white">{totalLeads}</p>
            <p className="text-xs text-slate-500 mt-1">
              {activity.leads_walk_in} walk-in • {activity.leads_phone} phone • {activity.leads_internet} web
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-xs text-slate-500 uppercase">Write-ups</p>
            <p className="text-2xl font-bold text-white">{activity.writeups || 0}</p>
          </div>
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
            <p className="text-xs text-emerald-400 uppercase">Sales</p>
            <p className="text-2xl font-bold text-emerald-400">{activity.sales || 0}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-xs text-slate-500 uppercase">Appointments</p>
            <p className="text-2xl font-bold text-white">{activity.appointments_scheduled || 0}</p>
          </div>
        </div>
        {activity.notes && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-slate-400">{activity.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const WeeklyView = ({ activities, selectedDate, totals }) => {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Leads</p>
            <p className="text-2xl font-bold text-white">{totals.leads}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Write-ups</p>
            <p className="text-2xl font-bold text-white">{totals.writeups}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-emerald-400 uppercase">Sales</p>
            <p className="text-2xl font-bold text-emerald-400">{totals.sales}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Appointments</p>
            <p className="text-2xl font-bold text-white">{totals.appointments}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Days Worked</p>
            <p className="text-2xl font-bold text-white">{totals.daysWorked}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111113] border-[#1f1f23]">
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                <th className="pb-3">Day</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Leads</th>
                <th className="pb-3">Write-ups</th>
                <th className="pb-3">Sales</th>
                <th className="pb-3">Appts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayActivity = activities.find(a => a.date === dateStr);
                const leads = (dayActivity?.leads_walk_in || 0) + (dayActivity?.leads_phone || 0) + (dayActivity?.leads_internet || 0);
                const worked = dayActivity?.worked !== false;
                
                return (
                  <tr key={dateStr} className="hover:bg-white/5">
                    <td className="py-3 font-medium text-white">{format(day, 'EEE, MMM d')}</td>
                    <td className="py-3">
                      {dayActivity ? (
                        worked ? <span className="text-emerald-400 text-xs">Worked</span> : <span className="text-amber-400 text-xs">Off</span>
                      ) : <span className="text-slate-600 text-xs">-</span>}
                    </td>
                    <td className="py-3 font-mono text-slate-300">{leads || '-'}</td>
                    <td className="py-3 font-mono text-slate-300">{dayActivity?.writeups || '-'}</td>
                    <td className="py-3 font-mono font-semibold text-emerald-400">{dayActivity?.sales || '-'}</td>
                    <td className="py-3 font-mono text-slate-300">{dayActivity?.appointments_scheduled || '-'}</td>
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

const MonthlyView = ({ activities, selectedDate, totals }) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Monthly Leads</p>
            <p className="text-2xl font-bold text-white">{totals.leads}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Write-ups</p>
            <p className="text-2xl font-bold text-white">{totals.writeups}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-emerald-400 uppercase">Monthly Sales</p>
            <p className="text-2xl font-bold text-emerald-400">{totals.sales}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Appointments</p>
            <p className="text-2xl font-bold text-white">{totals.appointments}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Days Worked</p>
            <p className="text-2xl font-bold text-white">{totals.daysWorked}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111113] border-[#1f1f23]">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 pb-2">{day}</div>
            ))}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {monthDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayActivity = activities.find(a => a.date === dateStr);
              const hasSale = dayActivity?.sales > 0;
              const worked = dayActivity?.worked !== false;
              
              return (
                <div
                  key={dateStr}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm ${
                    hasSale ? 'bg-emerald-500/20 text-emerald-400' :
                    dayActivity && !worked ? 'bg-amber-500/10 text-amber-400/50' :
                    dayActivity ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-600'
                  }`}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {hasSale && <span className="text-xs font-bold">{dayActivity.sales}</span>}
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
  const [salesTarget, setSalesTarget] = useState(currentGoal?.yearly_sales_target || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentGoal) {
      setSalesTarget(currentGoal.yearly_sales_target);
    }
  }, [currentGoal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      year: year,
      yearly_sales_target: parseInt(salesTarget) || 0,
    });
    setLoading(false);
  };

  const weeklyNeeded = salesTarget ? (parseInt(salesTarget) / 52).toFixed(1) : 0;
  const monthlyNeeded = salesTarget ? (parseInt(salesTarget) / 12).toFixed(1) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#1f1f23] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{currentGoal ? 'Edit' : 'Set'} Yearly Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300">How many units do you want to sell in {year}?</Label>
            <Input
              type="number"
              value={salesTarget}
              onChange={(e) => setSalesTarget(e.target.value)}
              placeholder="e.g., 120"
              className="text-2xl h-14 text-center bg-white/5 border-white/10 text-white"
              required
              data-testid="goal-sales-target"
            />
          </div>
          
          {salesTarget > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-3">To hit your goal, you'll need:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">{weeklyNeeded}</p>
                  <p className="text-xs text-slate-500">sales per week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{monthlyNeeded}</p>
                  <p className="text-xs text-slate-500">sales per month</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 btn-success" disabled={loading || !salesTarget}>
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
    worked: true,
    leads_walk_in: 0,
    leads_phone: 0,
    leads_internet: 0,
    writeups: 0,
    sales: 0,
    appointments_scheduled: 0,
    appointments_shown: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      date: format(date, 'yyyy-MM-dd'),
      worked: existingActivity?.worked !== false,
      leads_walk_in: existingActivity?.leads_walk_in || 0,
      leads_phone: existingActivity?.leads_phone || 0,
      leads_internet: existingActivity?.leads_internet || 0,
      writeups: existingActivity?.writeups || 0,
      sales: existingActivity?.sales || 0,
      appointments_scheduled: existingActivity?.appointments_scheduled || 0,
      appointments_shown: existingActivity?.appointments_shown || 0,
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
      <DialogContent className="bg-[#111113] border-[#1f1f23] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Log Activity - {format(date, 'MMM d, yyyy')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Work Day Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              {form.worked ? <Briefcase className="w-5 h-5 text-emerald-400" /> : <Coffee className="w-5 h-5 text-amber-400" />}
              <div>
                <p className="font-medium text-white">{form.worked ? 'Work Day' : 'Day Off'}</p>
                <p className="text-xs text-slate-500">Toggle if you didn't work today</p>
              </div>
            </div>
            <Switch
              checked={form.worked}
              onCheckedChange={(v) => setForm({ ...form, worked: v })}
              data-testid="worked-toggle"
            />
          </div>

          {form.worked && (
            <>
              {/* Leads */}
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase">Leads</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Walk-in</p>
                    <Input type="number" min="0" value={form.leads_walk_in} onChange={(e) => setForm({ ...form, leads_walk_in: e.target.value })} className="bg-white/5 border-white/10 text-white text-center" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <Input type="number" min="0" value={form.leads_phone} onChange={(e) => setForm({ ...form, leads_phone: e.target.value })} className="bg-white/5 border-white/10 text-white text-center" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Internet</p>
                    <Input type="number" min="0" value={form.leads_internet} onChange={(e) => setForm({ ...form, leads_internet: e.target.value })} className="bg-white/5 border-white/10 text-white text-center" />
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Write-ups/Quotes</Label>
                  <Input type="number" min="0" value={form.writeups} onChange={(e) => setForm({ ...form, writeups: e.target.value })} className="bg-white/5 border-white/10 text-white text-center" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-emerald-400">SALES</Label>
                  <Input type="number" min="0" value={form.sales} onChange={(e) => setForm({ ...form, sales: e.target.value })} className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-center text-xl font-bold" data-testid="activity-sales" />
                </div>
              </div>

              {/* Appointments */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Appts Scheduled</Label>
                  <Input type="number" min="0" value={form.appointments_scheduled} onChange={(e) => setForm({ ...form, appointments_scheduled: e.target.value })} className="bg-white/5 border-white/10 text-white text-center" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Appts Shown</Label>
                  <Input type="number" min="0" value={form.appointments_shown} onChange={(e) => setForm({ ...form, appointments_shown: e.target.value })} className="bg-white/5 border-white/10 text-white text-center" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." rows={2} className="bg-white/5 border-white/10 text-white" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 btn-success" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesTracker;
