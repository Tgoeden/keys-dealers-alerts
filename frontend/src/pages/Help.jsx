import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import {
  HelpCircle,
  Users,
  Key,
  Clock,
  Share2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Settings,
  TrendingUp,
  Upload,
  MessageSquare,
  Shield,
  LogIn,
  FileText,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

const FAQ_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: LogIn,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    faqs: [
      {
        q: 'How do I log in to KeyFlow?',
        a: 'Go to the login page and enter your email and password provided by your dealership admin. Check "Keep me signed in" to stay logged in for 7 days. Without this option, you\'ll be logged out after 5 hours of inactivity.',
      },
      {
        q: 'What is Demo Mode?',
        a: 'Demo Mode lets you explore KeyFlow without creating an account. It\'s limited to 4 keys and 1 user. Click "Try Demo" on the login page to start. Demo data resets when you log out.',
      },
      {
        q: 'How do I access Owner mode?',
        a: 'Tap the KeyFlow logo 5 times quickly on the login page. This will open a PIN entry modal. Enter the owner PIN (provided separately) to access owner-level features like creating dealerships.',
      },
      {
        q: 'I forgot my password. What do I do?',
        a: 'Contact your dealership administrator. They can create a new account for you or reset your credentials. Owners can also manage user accounts.',
      },
    ],
  },
  {
    id: 'key-management',
    title: 'Key Management',
    icon: Key,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    faqs: [
      {
        q: 'How do I add a new key?',
        a: 'Click "Add Key" on the Key Management page. Enter the Stock Number, select New or Used condition, and fill in Year, Make, and Model. For automotive dealerships, you can optionally add the VIN. Click "Add Key" to save.',
      },
      {
        q: 'How do I check out a key?',
        a: 'Find the key card and click "Check Out". Select a reason (Test Drive, Service Loaner, etc.). For RV dealerships, select a service bay if applicable. Add any notes about the checkout, then confirm.',
      },
      {
        q: 'How do I return a key?',
        a: 'Find the checked-out key (it will have an orange "Out" badge) and click "Return Key". Add any return notes if needed, then confirm the return.',
      },
      {
        q: 'How do I bulk import keys?',
        a: 'Click "Import CSV" next to the "Add Key" button. Upload a CSV file with columns: Condition (New/Used), Stock Number, Year, Make, Model. Download the template for the exact format. The system will validate and import your keys.',
      },
      {
        q: 'Where can I see checkout notes?',
        a: 'Keys with notes will show a "View Notes" link. Click it to see all notes from current and previous checkouts. Notes are preserved through multiple checkout/return cycles.',
      },
      {
        q: 'What do the key status badges mean?',
        a: '"Available" (green) means the key is in the rack and can be checked out. "Out" (orange) means the key is currently checked out. You can see who has it and for how long.',
      },
    ],
  },
  {
    id: 'sales-tracker',
    title: 'Sales Tracker',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    faqs: [
      {
        q: 'How do I set my sales goal?',
        a: 'Go to Sales Tracker (green button in navigation). Click "Set Goal" and enter your yearly sales target. The system will calculate your required weekly and monthly pace automatically.',
      },
      {
        q: 'How do I log daily activities?',
        a: 'In Sales Tracker, click "Log Activity". Enter your daily numbers: leads (walk-in, phone, internet), write-ups, sales, and appointments. Mark whether you worked that day. Your progress updates automatically.',
      },
      {
        q: 'What does "Goal Achievement Probability" mean?',
        a: 'This percentage shows how likely you are to hit your yearly goal based on your current pace. It adjusts as you log activities. Above 80% is great, 50-80% means you need to pick up the pace.',
      },
      {
        q: 'Can my manager see my sales tracker?',
        a: 'Yes, dealership admins can view the sales progress of all team members in their dealership. This helps with coaching and tracking team performance.',
      },
      {
        q: 'How do I get back to Key Management from Sales Tracker?',
        a: 'Click the "Back to KeyFlow" button in the top navigation (where the green Sales Tracker button normally appears). This takes you back to the Key Management page.',
      },
    ],
  },
  {
    id: 'user-management',
    title: 'Users & Access',
    icon: Users,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    faqs: [
      {
        q: 'How do I add a new user to my dealership?',
        a: 'There are two ways: 1) Go to User Management and click "Add User" to create an account directly. 2) Go to Share Access and create an invite link - send it to your team member and they can register themselves.',
      },
      {
        q: 'What\'s the difference between Admin and Staff roles?',
        a: 'Admins can manage keys, users, settings, and view team sales progress. Staff members can check keys in/out and use the Sales Tracker for their own goals. Only Admins can create invite links for other staff.',
      },
      {
        q: 'How do invite links work?',
        a: 'Go to Share Access and click "Create Invite Link". Choose Admin or Staff role. Copy the link and send it to your team member. They\'ll register with their own email/password and automatically join your dealership.',
      },
      {
        q: 'Can I delete a user?',
        a: 'Yes, go to User Management, find the user, and click the delete button. This removes their access but preserves their historical data (key checkouts, sales activities).',
      },
      {
        q: 'How long do invite links last?',
        a: 'Invite links expire after 7 days. If a link expires, simply create a new one. Used links cannot be reused - each person needs their own invite.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Customization',
    icon: Settings,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    faqs: [
      {
        q: 'How do I add my dealership logo?',
        a: 'Go to Settings and find the Branding section. Enter the URL of your logo image (it must be publicly accessible). The logo will appear in the app once you save.',
      },
      {
        q: 'How do I change the app colors?',
        a: 'In Settings > Branding, you can select from preset color themes or enter custom hex codes for primary and secondary colors. Use the preview to see how it looks before saving.',
      },
      {
        q: 'What is the Key Alert Threshold?',
        a: 'This setting determines when a key is flagged as "overdue". The default is 30 minutes. Adjust based on your needs - longer for extended test drives, shorter for quick demos.',
      },
      {
        q: 'Are settings shared across all users?',
        a: 'Branding settings (logo, colors) apply to everyone in your dealership. Alert thresholds are set at the dealership level. Individual users set their own sales goals.',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Logs & Reports',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    faqs: [
      {
        q: 'Where can I see key activity history?',
        a: 'Go to Logs & Reports to see a complete history of all key checkouts and returns. You can filter by date, user, or specific keys. This helps track accountability and usage patterns.',
      },
      {
        q: 'Can I export reports?',
        a: 'Currently, you can view all activity in the Logs page. Export functionality for CSV/PDF reports is coming in a future update.',
      },
      {
        q: 'Who can access the logs?',
        a: 'Dealership Admins and Owners can view all logs for their dealership. Staff members can only see their own checkout history.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    faqs: [
      {
        q: 'I can\'t log in. What should I do?',
        a: 'Double-check your email and password. Make sure caps lock is off. If you\'re still having trouble, contact your dealership admin to verify your account exists and reset your password if needed.',
      },
      {
        q: 'The app logged me out unexpectedly.',
        a: 'If you didn\'t check "Keep me signed in", the app logs you out after 5 hours of inactivity for security. Simply log back in. Check the box next time for longer sessions.',
      },
      {
        q: 'I can\'t see certain features or buttons.',
        a: 'Some features are role-specific. Staff members don\'t see User Management or Settings. If you need admin access, ask your dealership admin to upgrade your role.',
      },
      {
        q: 'Changes I made aren\'t showing up.',
        a: 'Try refreshing the page. If the issue persists, log out and log back in. Changes are saved automatically, so your data should be preserved.',
      },
      {
        q: 'The CSV import failed. Why?',
        a: 'Check that your CSV follows the correct format: Condition, Stock Number, Year, Make, Model. Each row should have at least Condition and Stock Number. Stock numbers must be unique within your dealership.',
      },
    ],
  },
];

const Help = () => {
  const [expandedSection, setExpandedSection] = useState('getting-started');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
    setExpandedFaq(null);
  };

  const toggleFaq = (sectionId, faqIndex) => {
    const key = `${sectionId}-${faqIndex}`;
    setExpandedFaq(expandedFaq === key ? null : key);
  };

  // Filter FAQs based on search
  const filteredSections = searchQuery
    ? FAQ_SECTIONS.map(section => ({
        ...section,
        faqs: section.faqs.filter(
          faq =>
            faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(section => section.faqs.length > 0)
    : FAQ_SECTIONS;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="help-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Help & FAQ
          </h1>
          <p className="text-slate-400 mt-1">
            Find answers to common questions about KeyFlow
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            className="pl-10 h-12 bg-[#111113] border-[#1f1f23] text-white"
            data-testid="help-search"
          />
        </div>

        {/* Quick Tips */}
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Quick Tips</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Tap the KeyFlow logo <strong>5 times</strong> for owner access</li>
                  <li>• Check <strong>"Keep me signed in"</strong> to stay logged in for 7 days</li>
                  <li>• Use <strong>CSV Import</strong> to add multiple keys at once</li>
                  <li>• Click <strong>"View Notes"</strong> on any key to see its history</li>
                  <li>• <strong>Invite links</strong> are the easiest way to add new team members</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Sections */}
        <div className="space-y-4">
          {filteredSections.map((section) => (
            <Card
              key={section.id}
              className="bg-[#111113] border-[#1f1f23] overflow-hidden"
              data-testid={`help-section-${section.id}`}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${section.bgColor} flex items-center justify-center ${section.color}`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-white block">{section.title}</span>
                    <span className="text-xs text-slate-500">{section.faqs.length} questions</span>
                  </div>
                </div>
                {expandedSection === section.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {expandedSection === section.id && (
                <div className="border-t border-white/10">
                  {section.faqs.map((faq, index) => (
                    <div key={index} className="border-b border-white/5 last:border-0">
                      <button
                        onClick={() => toggleFaq(section.id, index)}
                        className="w-full p-4 flex items-start justify-between hover:bg-white/5 transition-colors text-left"
                      >
                        <span className="text-sm text-slate-200 pr-4">{faq.q}</span>
                        {expandedFaq === `${section.id}-${index}` ? (
                          <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                      {expandedFaq === `${section.id}-${index}` && (
                        <div className="px-4 pb-4 animate-fade-in">
                          <p className="text-sm text-slate-400 bg-white/5 rounded-lg p-3">
                            {faq.a}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredSections.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
            <p className="text-slate-400 text-sm">
              Try different keywords or browse the sections above
            </p>
          </div>
        )}

        {/* Contact Support */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardContent className="p-6 text-center">
            <HelpCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">Still Need Help?</h3>
            <p className="text-sm text-slate-400">
              Contact your dealership administrator or system owner for additional assistance
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Help;
