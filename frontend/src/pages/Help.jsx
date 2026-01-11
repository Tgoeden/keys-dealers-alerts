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
  Upload,
  MessageSquare,
  Shield,
  LogIn,
  FileText,
  Search,
  Camera,
  CheckCircle,
  Wrench,
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
        q: 'How do I log in as an Admin?',
        a: 'Select "Admin Login" on the login page, choose your dealership from the dropdown, and enter your 4-6 digit PIN. Check "Keep me signed in" to stay logged in.',
      },
      {
        q: 'How do I log in as a Staff member?',
        a: 'Select "Staff Login" on the login page, choose your dealership, enter your name exactly as your admin registered it, and enter your PIN. Without "Keep me signed in" checked, you\'ll be logged out after 6 hours of inactivity.',
      },
      {
        q: 'What is Demo Mode?',
        a: 'Demo Mode lets you explore KeyFlow without creating an account. It\'s limited to 4 keys and 1 user. Click "Try Demo" on the login page to start. Demo data resets when you log out.',
      },
      {
        q: 'I forgot my PIN. What do I do?',
        a: 'Contact your dealership administrator. They can create a new account for you with a new PIN, or reset your credentials.',
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
    id: 'needs-attention',
    title: 'Needs Attention / Repairs',
    icon: Wrench,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    faqs: [
      {
        q: 'What is the "Needs Attention" feature?',
        a: 'When checking out a key, any user can flag a unit as "Needs Attention" if they notice something wrong - mechanical issues, damage, low fuel, etc. This creates a repair request that everyone can see on the Needs Attention dashboard.',
      },
      {
        q: 'How do I flag a unit as needing attention?',
        a: 'During key checkout, toggle ON the red "Needs Attention" switch. You\'ll be required to add notes explaining the issue. You can also attach up to 3 photos showing the problem.',
      },
      {
        q: 'How do I add photos when flagging an issue?',
        a: 'After turning on "Needs Attention", click "Add Photo" to upload images from your phone or computer. You can add up to 3 photos per flagged issue. Photos help the service team understand and locate the problem quickly.',
      },
      {
        q: 'Who can see the photos I upload?',
        a: 'Everyone in your dealership can view photos attached to repair requests. This helps service techs, porters, and managers quickly understand issues without needing verbal explanations.',
      },
      {
        q: 'How do I mark a unit as fixed?',
        a: 'Any user can mark a flagged unit as "Fixed" by clicking the "Mark Fixed" button on the Needs Attention page. This changes the status from red (Needs Attention) to green (Fixed).',
      },
      {
        q: 'Who can clear items from the Needs Attention list?',
        a: 'Only Admins can permanently clear (delete) items from the Needs Attention dashboard. This ensures there\'s an audit trail of all issues, even after they\'re resolved.',
      },
      {
        q: 'What\'s the difference between "Fixed" and "Cleared"?',
        a: '"Fixed" means the issue has been resolved - anyone can mark this. "Cleared" means the record is removed from the dashboard - only admins can do this. Fixed items stay visible until an admin clears them.',
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
        a: 'Go to User Management and click "Add User". Enter their name (this is how they\'ll sign in - must be unique), create a 4-6 digit PIN for them, and select their role (Sales, Service, Delivery, Porter, Lot Tech, or custom).',
      },
      {
        q: 'What are the different user roles?',
        a: 'Standard roles include Sales, Service, Delivery, Porter, and Lot Tech. All staff roles have the same permissions - they can check keys in/out, flag issues, and mark items as fixed. Admins can additionally manage users, settings, and clear repair logs.',
      },
      {
        q: 'Can I create custom roles?',
        a: 'Yes! Go to Settings > User Roles. Enter a new role name and click "Add Role". Custom roles work the same as standard roles but help you organize staff by department or function.',
      },
      {
        q: 'How do invite links work?',
        a: 'Go to Share Access and click "Create Invite Link". Choose Admin or Staff role. Copy the link and send it to your team member. They\'ll register with their own credentials and automatically join your dealership.',
      },
      {
        q: 'Can I delete a user?',
        a: 'Yes, go to User Management, find the user, and click the delete button. This removes their access but preserves their historical data (key checkouts, repair flags).',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Security',
    icon: Settings,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    faqs: [
      {
        q: 'How do I change my PIN?',
        a: 'Go to Settings > PIN Security and click "Change PIN". Enter your current PIN, then your new 4-6 digit PIN twice to confirm. Your new PIN takes effect immediately.',
      },
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
        a: 'Dealership Admins can view all logs for their dealership. Staff members can see activity on the Keys page but have limited access to full reports.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    faqs: [
      {
        q: 'I can\'t log in. What should I do?',
        a: 'Make sure you\'re selecting the correct dealership and entering your name exactly as registered. PINs are 4-6 digits only. If you\'re still having trouble, contact your dealership admin to verify your account exists.',
      },
      {
        q: 'The app logged me out unexpectedly.',
        a: 'If you didn\'t check "Keep me signed in", the app logs you out after 6 hours of inactivity for security. Simply log back in. Check the box next time for longer sessions.',
      },
      {
        q: 'I can\'t see certain features or buttons.',
        a: 'Some features are role-specific. Staff members don\'t see User Management or Settings. If you need admin access, ask your dealership admin to upgrade your role.',
      },
      {
        q: 'Photos I uploaded aren\'t showing.',
        a: 'Make sure your phone has a stable internet connection when uploading. Large photos may take a moment to upload. If photos still don\'t appear, try refreshing the page or logging out and back in.',
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
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Quick Tips</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Check <strong>"Keep me signed in"</strong> to stay logged in longer</li>
                  <li>• Use <strong>CSV Import</strong> to add multiple keys at once</li>
                  <li>• Click <strong>"View Notes"</strong> on any key to see its history</li>
                  <li>• <strong>Flag issues</strong> during checkout with photos to help service</li>
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
