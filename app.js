/**
 * CampusLink - Main Application & Backend Controller
 * Simulates a robust university database using localStorage & sessionStorage.
 * Also supports real-time synchronization via Supabase Auth & PostgreSQL.
 */

/**
 * Supabase Configuration Block
 * To enable the real-time online cloud database, plug in your free Supabase credentials below!
 * If left empty, the application will seamlessly fall back to local localStorage database mode.
 */
const supabaseConfig = {
    url: "https://bakyxnrubwmtfzngootu.supabase.co",
    anonKey: "sb_publishable_EUcYDwNC3AIc-TAWNBnyMA_JDQ2-w51"
};

// Initialize Supabase dynamically if keys are configured
let supabaseClient = null;

if (typeof supabase !== 'undefined' && supabaseConfig.url !== "YOUR_SUPABASE_URL") {
    try {
        supabaseClient = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
        console.log("CampusLink: Live Supabase Connected successfully!");
    } catch (err) {
        console.error("CampusLink: Supabase initialization failed:", err);
    }
} else {
    console.log("CampusLink: Running in Local Storage database mode (No Supabase keys found).");
}

function parseArrayField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    // Fall back to comma-split
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

const app = {
    // Active navigation state
    currentView: 'home',
    currentUser: null,
    currentUserWishlist: [],
    currentListingsCache: [],
    currentOffersCache: [],
    currentTeamsCache: [],
    currentRedditPostsCache: [],
    activeChatEmail: null,
    activeChatChannel: null,
    activeProfileTab: 'listings',
    
    // Reddit states
    activeSubreddit: 'all',
    activeRedditSort: 'hot',

    parseArrayField(value) {
        return parseArrayField(value);
    },

    isSupabaseEnabled() {
        return supabaseClient !== null;
    },

    isFirebaseEnabled() {
        return this.isSupabaseEnabled();
    },

    // Core Init
    init() {
        console.log("CampusLink Initializing...");
        
        // Seed mock database entries on first run
        this.seedMockDatabase();
        
        // Setup Form & Action Event Listeners
        this.setupEventListeners();
        
        // Check Session Gate
        if (this.isSupabaseEnabled()) {
            // Check current session
            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    this.handleSupabaseUserSession(session.user);
                } else {
                    this.renderAnonymousUI();
                }
            });

            // Listen to auth changes
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (session) {
                    this.handleSupabaseUserSession(session.user);
                } else {
                    this.renderAnonymousUI();
                }
            });

            // Subscribe to realtime offers changes
            try {
                supabaseClient.channel('public:offers')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, payload => {
                        console.log('Realtime offers update received:', payload);
                        this.renderProducts();
                    })
                    .subscribe();
            } catch (err) {
                console.error("Failed to subscribe to realtime offers channel:", err);
            }
        } else {
            this.checkAuthSession();
        }
    },

    handleSupabaseUserSession(authUser) {
        Promise.all([
            supabaseClient.from('users').select('*').eq('email', authUser.email).single(),
            supabaseClient.from('profiles').select('role').eq('email', authUser.email).maybeSingle()
        ]).then(([userRes, profileRes]) => {
            if (userRes.error || !userRes.data) {
                console.error("User profile document not found in Supabase:", userRes.error);
                this.logout();
            } else {
                this.currentUser = {
                    ...userRes.data,
                    email: authUser.email,
                    role: profileRes.data?.role || 'student'
                };

                // Auto-seed GitHub for the owner account if not yet set
                if (authUser.email === 'vvce25cse0197@vvce.ac.in') {
                    supabaseClient.from('profiles')
                        .select('github')
                        .eq('email', authUser.email)
                        .maybeSingle()
                        .then(({ data: prof }) => {
                            if (!prof || !prof.github) {
                                supabaseClient.from('profiles').upsert({
                                    email: authUser.email,
                                    github: 'TVAjay24',
                                    bio: prof ? (prof.bio || '') : 'CSE student at VVCE. Building CampusLink.',
                                    skills: prof ? (prof.skills || ['JavaScript','HTML','CSS','Supabase']) : ['JavaScript','HTML','CSS','Supabase'],
                                    linkedin: prof ? (prof.linkedin || '') : ''
                                }).then(() => console.log('GitHub TVAjay24 linked to profile.'));
                            }
                        });
                }

                this.renderAuthenticatedUI();
            }
        }).catch(err => {
            console.error("Error in handleSupabaseUserSession:", err);
            this.logout();
        });
    },


    renderAuthenticatedUI() {
        // Show main layout & elements
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('main-navbar').style.display = 'block';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';

        // Update logo interactions based on role
        const logo = document.querySelector('.logo');
        const drawerLogo = document.querySelector('.nav-drawer-logo');
        const authLogo = document.querySelector('.auth-logo');
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        
        if (logo) {
            logo.style.cursor = isAdmin ? 'pointer' : 'default';
            logo.style.userSelect = 'none';
            logo.title = isAdmin ? 'Double-click to open Admin Dashboard' : '';
        }
        if (drawerLogo) {
            drawerLogo.style.cursor = isAdmin ? 'pointer' : 'default';
            drawerLogo.style.userSelect = 'none';
            drawerLogo.title = isAdmin ? 'Double-click to open Admin Dashboard' : '';
        }
        if (authLogo) {
            authLogo.style.cursor = isAdmin ? 'pointer' : 'default';
            authLogo.style.userSelect = 'none';
            authLogo.title = isAdmin ? 'Double-click to open Admin Dashboard' : '';
        }

        // Configure chip tags (Initials SG, name split)
        document.getElementById('user-chip-name').textContent = this.currentUser.name.split(' ')[0];
        const nameParts = this.currentUser.name.split(' ');
        const initials = nameParts.map(p => p[0]).join('').toUpperCase().substring(0, 2);
        document.getElementById('user-chip-avatar').textContent = initials;

        // Refresh dashboards
        this.renderProducts();
        this.renderTeams();
        this.renderHackathons();
        this.renderRedditPosts();
        this.renderChatSidebar();
        this.updateUnreadCountBadge();

        // Navigate to last stored view or default home
        this.navigate(this.currentView);
    },

    renderAnonymousUI() {
        // Locking Dashboard
        this.currentUser = null;
        document.getElementById('auth-page').style.display = 'flex';
        document.getElementById('main-navbar').style.display = 'none';
        document.getElementById('app-content').style.display = 'none';
        document.getElementById('main-footer').style.display = 'none';
        
        // Clear fields and toggle signin active tab
        this.switchAuthTab('signin');
    },

    // 1. DATABASE SEEDING
    seedMockDatabase() {
        // Self-healing database check to ensure Suresh G. is seeded for the image-matching experience
        if (localStorage.getItem('cl_users')) {
            const tempUsers = JSON.parse(localStorage.getItem('cl_users')) || [];
            if (!tempUsers.some(u => u.email === 'suresh@vvce.ac.in')) {
                localStorage.removeItem('cl_users');
                localStorage.removeItem('cl_listings');
                localStorage.removeItem('cl_teams');
                localStorage.removeItem('cl_hackathons');
                localStorage.removeItem('cl_reddit_posts');
                console.log("Reseeding database to include Suresh Gowda...");
            }
        }

        // Mock Users
        if (!localStorage.getItem('cl_users')) {
            const mockUsers = [
                { name: "Suresh Gowda", email: "suresh@vvce.ac.in", branch: "ISE", semester: "6", phone: "9448011223", password: "password123" },
                { name: "Priya Patel", email: "priya@vvce.ac.in", branch: "ISE", semester: "6", phone: "9876543210", password: "password123" },
                { name: "Rahul Sharma", email: "rahul@vvce.ac.in", branch: "CSE", semester: "8", phone: "9845012345", password: "password123" },
                { name: "Amit Kumar", email: "amit@vvce.ac.in", branch: "ECE", semester: "4", phone: "8899001122", password: "password123" },
                { name: "Neha Singh", email: "neha@vvce.ac.in", branch: "CSE", semester: "6", phone: "7766554433", password: "password123" },
                { name: "Vikram Tech", email: "vikram@vvce.ac.in", branch: "ISE", semester: "4", phone: "9900990099", password: "password123" },
                { name: "Sneha Reddy", email: "sneha@vvce.ac.in", branch: "ECE", semester: "8", phone: "9123456789", password: "password123" }
            ];
            localStorage.setItem('cl_users', JSON.stringify(mockUsers));
        }

        // Mock Listings (Marketplace)
        if (!localStorage.getItem('cl_listings')) {
            const mockListings = [
                {
                    id: 1,
                    title: "Engineering Mathematics - K.A. Stroud (8th Edition)",
                    price: 450,
                    category: "Books",
                    condition: "Used",
                    description: "Standard engineering mathematics textbook. Excellent condition, pages clean with minimal marking.",
                    sellerName: "Rahul Sharma",
                    sellerEmail: "rahul@vvce.ac.in",
                    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
                    timestamp: "2 hours ago"
                },
                {
                    id: 2,
                    title: "Casio FX-991EX ClassWiz Scientific Calculator",
                    price: 800,
                    category: "Electronics",
                    condition: "Like New",
                    description: "VVCE approved classwiz scientific calculator. Brand new batteries, completely scratch-free.",
                    sellerName: "Priya Patel",
                    sellerEmail: "priya@vvce.ac.in",
                    image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&q=80&w=600",
                    timestamp: "5 hours ago"
                },
                {
                    id: 3,
                    title: "Hostel Study Chair - Ergonomic Cushion",
                    price: 600,
                    category: "Furniture",
                    condition: "Used",
                    description: "Extremely comfortable study chair with high backing. Ideal for VVCE hostel rooms.",
                    sellerName: "Amit Kumar",
                    sellerEmail: "amit@vvce.ac.in",
                    image: "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600",
                    timestamp: "1 day ago"
                },
                {
                    id: 4,
                    title: "MacBook Air M1 2020 (8GB/256GB SSD)",
                    price: 45000,
                    category: "Electronics",
                    condition: "Used",
                    description: "Space gray MacBook Air in pristine condition. Battery cycle is 120, battery health is 92%. Best laptop for CS/IS students.",
                    sellerName: "Neha Singh",
                    sellerEmail: "neha@vvce.ac.in",
                    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
                    timestamp: "1 day ago"
                },
                {
                    id: 5,
                    title: "Data Structures Handwritten Notes (Complete ISE/CSE)",
                    price: 150,
                    category: "Notes",
                    condition: "Used",
                    description: "Complete DS lecture notes, diagrams, and code snippets. Highly recommended for VTU exams.",
                    sellerName: "Vikram Tech",
                    sellerEmail: "vikram@vvce.ac.in",
                    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600",
                    timestamp: "2 days ago"
                },
                {
                    id: 6,
                    title: "Mini Drafter + Wooden Drawing Board",
                    price: 350,
                    category: "Lab Equipment",
                    condition: "Like New",
                    description: "VVCE first-year engineering drawing kit. Precision draft clamps, drawing board is fully flat and clean.",
                    sellerName: "Sneha Reddy",
                    sellerEmail: "sneha@vvce.ac.in",
                    image: "https://images.unsplash.com/photo-1629446219329-825026915682?auto=format&fit=crop&q=80&w=600",
                    timestamp: "3 days ago"
                }
            ];
            localStorage.setItem('cl_listings', JSON.stringify(mockListings));
        }

        // Mock Collab Teams
        if (!localStorage.getItem('cl_teams')) {
            const mockTeams = [
                {
                    id: 1,
                    teamName: "VVCE Hackathon Portal",
                    description: "We are developing a web-based hackathon dashboard specifically customized for VVCE computer clubs. The system will handle team registration, scoring, and digital certificate issuing.",
                    skills: "React, Node.js, Firebase",
                    openRoles: "Frontend Developer, Backend Lead",
                    createdBy: "Rahul Sharma",
                    createdByEmail: "rahul@vvce.ac.in",
                    applicants: [
                        { name: "Priya Patel", email: "priya@vvce.ac.in", branch: "ISE", semester: "6", phone: "9876543210" }
                    ]
                },
                {
                    id: 2,
                    teamName: "IoT Smart College Parking System",
                    description: "Forming a research group to build an active parking spot tracker using ESP32 controllers and ultrasonic sensors around the VVCE campus entrance parking zones.",
                    skills: "Arduino, C++, IoT, Flutter",
                    openRoles: "Hardware Engineer, Mobile Developer",
                    createdBy: "Priya Patel",
                    createdByEmail: "priya@vvce.ac.in",
                    applicants: []
                }
            ];
            localStorage.setItem('cl_teams', JSON.stringify(mockTeams));
        }

        // Mock Profiles
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        users.forEach(u => {
            const key = `cl_profile_${u.email}`;
            if (!localStorage.getItem(key)) {
                let defaultProfile = { bio: "", skills: [], github: "", linkedin: "" };
                if (u.email === 'rahul@vvce.ac.in') {
                    defaultProfile = { bio: "Senior Computer Science student. Loves developing full stack mobile applications and hacking with web architectures.", skills: ["React Native", "Node.js", "MongoDB", "Figma"], github: "rahulsharma", linkedin: "rahul-placement" };
                } else if (u.email === 'priya@vvce.ac.in') {
                    defaultProfile = { bio: "Information Science undergrad. Enthusiastic about embedded systems, smart devices, and Flutter development.", skills: ["ESP32", "C++", "Flutter", "TailwindCSS"], github: "priya-patel", linkedin: "priya-patel-dev" };
                } else if (u.email === 'vvce25cse0197@vvce.ac.in') {
                    defaultProfile = { bio: "CSE student at VVCE. Building CampusLink.", skills: ["JavaScript", "HTML", "CSS", "Supabase"], github: "TVAjay24", linkedin: "" };
                }
                localStorage.setItem(key, JSON.stringify(defaultProfile));
            }
        });

        // Ensure real Supabase user profile has GitHub pre-set in localStorage cache
        const realUserProfileKey = 'cl_profile_vvce25cse0197@vvce.ac.in';
        if (!localStorage.getItem(realUserProfileKey)) {
            localStorage.setItem(realUserProfileKey, JSON.stringify({
                bio: "CSE student at VVCE. Building CampusLink.",
                skills: ["JavaScript", "HTML", "CSS", "Supabase"],
                github: "TVAjay24",
                linkedin: ""
            }));
        }


        // Seed Hackathons
        if (!localStorage.getItem('cl_hackathons')) {
            const mockHackathons = [
                {
                    id: 1,
                    title: "VVCE HackFest 2026",
                    organizer: "VVCE Computer Science Club",
                    dates: "June 12-14, 2026",
                    prizePool: "₹1,00,000",
                    activeRegistrations: 18,
                    bannerImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=600",
                    status: "registering",
                    details: "VVCE's premier 48-hour annual hackathon. Build innovative products in Web 3.0, AI/ML, and Smart Infrastructure. Compete against top college teams.",
                    timeline: [
                        { title: "Team Registration Closes", date: "June 5, 2026", active: true },
                        { title: "Ideation & Proposal Review", date: "June 8, 2026", active: false },
                        { title: "48-Hour Coding Phase", date: "June 12-14, 2026", active: false }
                    ]
                },
                {
                    id: 2,
                    title: "Smart India Hackathon (Internal)",
                    organizer: "VVCE R&D Cell & EDC",
                    dates: "July 2, 2026",
                    prizePool: "₹50,000",
                    activeRegistrations: 8,
                    bannerImage: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=600",
                    status: "registering",
                    details: "Internal college screening for the national SIH 2026. Solve ministries problem statements and secure a spot to represent VVCE in the national round.",
                    timeline: [
                        { title: "Proposal Submissions", date: "June 20, 2026", active: true },
                        { title: "Internal Jury Evaluation", date: "June 25, 2026", active: false },
                        { title: "Final PPT Pitching & Awards", date: "July 2, 2026", active: false }
                    ]
                },
                {
                    id: 3,
                    title: "CodeSprint Algorithms Contest",
                    organizer: "VVCE ACM Student Chapter",
                    dates: "June 30, 2026",
                    prizePool: "₹25,000",
                    activeRegistrations: 45,
                    bannerImage: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&q=80&w=600",
                    status: "upcoming",
                    details: "A high-speed competitive programming sprint featuring algorithm optimization, graph traversal, and complex array matrices. Individual or dual registration allowed.",
                    timeline: [
                        { title: "Contest Launch & CodeSprint Kickoff", date: "June 30, 2026", active: true }
                    ]
                }
            ];
            localStorage.setItem('cl_hackathons', JSON.stringify(mockHackathons));
        }

        // Seed Hackathon Registrations
        if (!localStorage.getItem('cl_hackathon_registrations')) {
            const mockRegistrations = [
                { hackathonId: 1, teamName: "Bit Busters", members: "Rahul (CSE), Priya (ISE), Amit (ECE)", phone: "9876543210", userEmail: "rahul@vvce.ac.in" }
            ];
            localStorage.setItem('cl_hackathon_registrations', JSON.stringify(mockRegistrations));
        }

        // Seed Reddit Posts (Communities)
        if (!localStorage.getItem('cl_reddit_posts')) {
            const mockRedditPosts = [
                {
                    id: 1,
                    subreddit: "vvce_coders",
                    title: "Help! VTU 4th Sem DAA Lab Programs",
                    body: "Hey coders! Is anyone done compiling the design and analysis of algorithms lab programs? I am getting a stack overflow exception on the Floyd-Warshall implementation when parsing large matrices. Any advice or GitHub links would be massively appreciated!",
                    flair: "Question",
                    authorName: "Vikram Tech",
                    authorEmail: "vikram@vvce.ac.in",
                    timestamp: "3 hours ago",
                    upvotes: ["priya@vvce.ac.in", "rahul@vvce.ac.in"],
                    downvotes: [],
                    commentsCount: 2
                },
                {
                    id: 2,
                    subreddit: "placements",
                    title: "Standard Preparation Kit for Honeywell & Cisco",
                    body: "The placement cell just announced recruitment drives for Honeywell (ISE/CSE) and Cisco (all branches) starting next month! Sharing my prepared DSA list and key topics: graph algorithms, system design components, and dynamic programming tricks. Let us study together!",
                    flair: "Guide",
                    authorName: "Neha Singh",
                    authorEmail: "neha@vvce.ac.in",
                    timestamp: "18 hours ago",
                    upvotes: ["priya@vvce.ac.in", "rahul@vvce.ac.in", "sneha@vvce.ac.in"],
                    downvotes: [],
                    commentsCount: 1
                },
                {
                    id: 3,
                    subreddit: "hostel_tales",
                    title: "Hostel Wi-Fi Speed Drop After 10 PM?",
                    body: "Is it just my corridor, or does the hostel campus Wi-Fi completely bottom out right after 10 PM? Web pages take ages to compile and code pushes timeout constantly. Can the admins allocate higher bandwidth for project developers?",
                    flair: "Discussion",
                    authorName: "Amit Kumar",
                    authorEmail: "amit@vvce.ac.in",
                    timestamp: "1 day ago",
                    upvotes: ["rahul@vvce.ac.in", "vikram@vvce.ac.in"],
                    downvotes: ["priya@vvce.ac.in"],
                    commentsCount: 1
                },
                {
                    id: 4,
                    subreddit: "general",
                    title: "Register for VVCE Annual HackFest 2026!",
                    body: "Vidyavardhaka CS Club is officially launching the HackFest registration! There is a cash prize pool of ₹1,00,000, free mentorship, pizza, and swag. Form your teams and register on the Hackathons tab today!",
                    flair: "Announcement",
                    authorName: "Rahul Sharma",
                    authorEmail: "rahul@vvce.ac.in",
                    timestamp: "2 hours ago",
                    upvotes: ["priya@vvce.ac.in", "neha@vvce.ac.in", "sneha@vvce.ac.in", "amit@vvce.ac.in"],
                    downvotes: [],
                    commentsCount: 0
                }
            ];
            localStorage.setItem('cl_reddit_posts', JSON.stringify(mockRedditPosts));
        }

        // Seed Reddit Comments
        if (!localStorage.getItem('cl_reddit_comments_1')) {
            const mockComments = [
                { id: 1, authorName: "Priya Patel", authorEmail: "priya@vvce.ac.in", body: "Check your dynamic matrix initialization! If you don't allocate memory properly, Floyd-Warshall will overflow on larger matrices. I have uploaded complete handwritten notes on the Marketplace detailing graph algorithms!", timestamp: "2 hours ago" },
                { id: 2, authorName: "Rahul Sharma", authorEmail: "rahul@vvce.ac.in", body: "Also, make sure you aren't recursion-nesting during matrix indexing. Standard iterative DP works best here.", timestamp: "1 hour ago" }
            ];
            localStorage.setItem('cl_reddit_comments_1', JSON.stringify(mockComments));
        }

        if (!localStorage.getItem('cl_reddit_comments_2')) {
            const mockComments = [
                { id: 1, authorName: "Priya Patel", authorEmail: "priya@vvce.ac.in", body: "This is super helpful Neha! Thanks a ton. Will definitely prepare standard graph problems.", timestamp: "12 hours ago" }
            ];
            localStorage.setItem('cl_reddit_comments_2', JSON.stringify(mockComments));
        }

        if (!localStorage.getItem('cl_reddit_comments_3')) {
            const mockComments = [
                { id: 1, authorName: "Rahul Sharma", authorEmail: "rahul@vvce.ac.in", body: "Agreed! It gets incredibly slow. Probably because everyone is streaming or playing CS online. I'll drop a note to the warden.", timestamp: "12 hours ago" }
            ];
            localStorage.setItem('cl_reddit_comments_3', JSON.stringify(mockComments));
        }

        // Mock Negotiation Offers
        if (!localStorage.getItem('cl_offers')) {
            const mockOffers = [
                {
                    id: 1001,
                    item_id: 2,
                    buyer_id: "rahul@vvce.ac.in",
                    buyer_name: "Rahul Sharma",
                    seller_id: "priya@vvce.ac.in",
                    proposed_price: 500,
                    status: "pending",
                    created_at: new Date().toISOString()
                }
            ];
            localStorage.setItem('cl_offers', JSON.stringify(mockOffers));
        }

        // Clean up legacy mock events & announcements from localStorage
        try {
            const storedEvts = JSON.parse(localStorage.getItem('cl_events') || '[]');
            const cleanEvts = storedEvts.filter(e => e && e.id !== 'mock-event-1' && e.id !== 'mock-event-2');
            localStorage.setItem('cl_events', JSON.stringify(cleanEvts));

            const storedAnns = JSON.parse(localStorage.getItem('cl_announcements') || '[]');
            const cleanAnns = storedAnns.filter(a => a && a.id !== 'mock-announcement-1' && a.id !== 'mock-announcement-2');
            localStorage.setItem('cl_announcements', JSON.stringify(cleanAnns));
        } catch (_) {}
    },

    // 2. SESSION & SECURITY GUARD
    checkAuthSession() {
        const storedUser = localStorage.getItem('cl_current_user');

        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            if (!this.currentUser.role) {
                const email = this.currentUser.email;
                this.currentUser.role = (email === 'admin@vvce.ac.in' || email === 'vvce25cse0197@vvce.ac.in') ? 'admin' : 'student';
                localStorage.setItem('cl_current_user', JSON.stringify(this.currentUser));
            }
            this.renderAuthenticatedUI();
        } else {
            this.renderAnonymousUI();
        }
    },

    handleLogoDoubleClick() {
        if (this.currentUser && this.currentUser.role === 'admin') {
            this.navigate('admin');
        } else {
            this.showToast('Admin access required', 'error');
        }
    },

    // Navigation Switcher
    navigate(viewId, event) {
        if (event) {
            event.preventDefault();
        }

        // If not logged in, force auth page block
        if (!this.currentUser) {
            this.checkAuthSession();
            return;
        }

        // Admin Dashboard Route Protection & Display Swapping
        const viewAdmin = document.getElementById('view-admin');
        if (viewId === 'admin') {
            if (this.currentUser.role === 'admin') {
                document.getElementById('main-navbar').style.display = 'none';
                document.getElementById('app-content').style.display = 'none';
                document.getElementById('main-footer').style.display = 'none';
                if (viewAdmin) {
                    viewAdmin.style.display = 'flex';
                }
                this.currentView = 'admin';
                this.loadAdminTab(this.currentAdminTab || 'overview');
                window.scrollTo(0, 0);
                return;
            } else {
                this.showToast('Admin access required', 'error');
                viewId = 'home'; // Redirect student to homepage
            }
        }

        // Restore standard shells if navigating away from admin
        if (viewAdmin) {
            viewAdmin.style.display = 'none';
        }
        const mainNavbar = document.getElementById('main-navbar');
        const appContent = document.getElementById('app-content');
        const mainFooter = document.getElementById('main-footer');
        if (mainNavbar) mainNavbar.style.display = 'block';
        if (appContent) appContent.style.display = 'block';
        if (mainFooter) mainFooter.style.display = 'block';

        // Intercept wishlist navigation and map to browse view with toggle active
        if (viewId === 'wishlist') {
            this.showWishlistOnly = true;
            viewId = 'browse';
        } else if (viewId === 'browse') {
            // Reset wishlist filter if clicking the direct Marketplace tab
            if (event) {
                this.showWishlistOnly = false;
            }
        } else {
            this.showWishlistOnly = false;
        }

        // Remove active class from all navigation items
        document.querySelectorAll('.nav-links a').forEach(el => {
            el.classList.remove('active');
        });

        // Sync drawer link active state
        document.querySelectorAll('#nav-drawer-links a').forEach(el => {
            el.classList.remove('active');
        });

        // Hide all page divisions
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
        });

        // Active corresponding nav link
        let activeLink = Array.from(document.querySelectorAll('.nav-links a')).find(a => 
            a.getAttribute('onclick') && a.getAttribute('onclick').includes(`'${viewId === 'browse' && this.showWishlistOnly ? 'wishlist' : viewId}'`)
        );
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Active drawer link
        let activeDrawerLink = Array.from(document.querySelectorAll('#nav-drawer-links a')).find(a =>
            a.getAttribute('onclick') && a.getAttribute('onclick').includes(`'${viewId === 'browse' && this.showWishlistOnly ? 'wishlist' : viewId}'`)
        );
        if (activeDrawerLink) {
            activeDrawerLink.classList.add('active');
        }


        // Display view container
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;
            window.scrollTo(0, 0);

            // Special subview rendering
            if (viewId === 'home') {
                this.renderAnnouncementsBanner();
                this.renderEventsBanner();
            } else if (viewId === 'browse') {
                this.renderProducts();
                if (this.showWishlistOnly) {
                    this.filterListings();
                }
            } else if (viewId === 'collab') {
                this.renderTeams();
            } else if (viewId === 'hackathons') {
                this.renderHackathons();
            } else if (viewId === 'reddit') {
                this.renderRedditPosts();
            } else if (viewId === 'chat') {
                this.renderChatSidebar();
                this.renderChatPane();
                this.toggleChatSidebar(true);
            } else if (viewId === 'profile') {
                this.renderProfile();
            }
        }

        // Re-compile icons
        if (window.lucide) lucide.createIcons();
    },

    // 3. AUTH LOGIC & INPUT VALIDATIONS
    switchAuthTab(tab) {
        const signinTab = document.getElementById('tab-signin');
        const signupTab = document.getElementById('tab-signup');
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');

        if (tab === 'signin') {
            signinTab.classList.add('active');
            signupTab.classList.remove('active');
            signinForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            signupTab.classList.add('active');
            signinTab.classList.remove('active');
            signupForm.style.display = 'block';
            signinForm.style.display = 'none';
        }
        
        if (window.lucide) lucide.createIcons();
    },

    validateEmail(prefix) {
        const input = document.getElementById(`${prefix}-email`);
        const group = document.getElementById(`${prefix}-email-group`);
        const button = document.getElementById(`${prefix}-submit-btn`);
        
        if (!input) return;
        const email = input.value.trim().toLowerCase();
        
        if (email === "") {
            group.classList.remove('has-error');
            if (button) button.disabled = true;
            return;
        }

        if (email.endsWith('@vvce.ac.in')) {
            group.classList.remove('has-error');
            if (button) button.disabled = false;
        } else {
            group.classList.add('has-error');
            if (button) button.disabled = true;
        }
    },

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        if (input.type === 'password') {
            input.type = 'text';
        } else {
            input.type = 'password';
        }
    },

    showForgotPassword(e) {
        e.preventDefault();
        this.openModal('forgot-password-modal');
        document.getElementById('reset-email').value = '';
        document.getElementById('reset-email-group').classList.remove('has-error');
        document.getElementById('reset-submit-btn').disabled = true;
    },

    // 4. TOAST NOTIFICATION HELPERS
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    // Modal Control System
    openModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.add('active');
            if (modalId === 'new-chat-modal') {
                this.populateNewChatStudents();
            }
        }
    },

    closeModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    populateNewChatStudents() {
        const select = document.getElementById('new-chat-select');
        if (!select) return;

        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        const currentEmail = this.currentUser.email;

        select.innerHTML = '<option value="" disabled selected>Choose a student...</option>';
        
        // Add VVCE AI Assistant option
        const aiOpt = document.createElement('option');
        aiOpt.value = 'campuslink_ai';
        aiOpt.textContent = '🤖 CampusLink AI Assistant';
        select.appendChild(aiOpt);

        users.forEach(u => {
            if (u.email !== currentEmail) {
                const opt = document.createElement('option');
                opt.value = u.email;
                opt.textContent = `${u.name} (${u.branch} | Sem ${u.semester})`;
                select.appendChild(opt);
            }
        });
    },

    startNewChatFromModal() {
        const select = document.getElementById('new-chat-select');
        if (!select) return;

        const selectedEmail = select.value;
        if (!selectedEmail) {
            this.showToast("Please select a student to chat with!", "error");
            return;
        }

        // Initialize thread in local storage if it doesn't exist
        const buyerInboxKey = `cl_messages_${this.currentUser.email}`;
        let buyerInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};

        if (!buyerInbox[selectedEmail]) {
            buyerInbox[selectedEmail] = [];
            // Add a warm initial greeting message
            if (selectedEmail === 'campuslink_ai') {
                buyerInbox[selectedEmail].push({
                    sender: 'campuslink_ai',
                    text: 'Hello! I am your virtual campus negotiator assistant. Ask me about any marketplace listing, how to negotiate prices, or secure meeting locations near the VVCE library!',
                    timestamp: 'Just now',
                    unread: false
                });
            } else {
                const users = JSON.parse(localStorage.getItem('cl_users')) || [];
                const student = users.find(u => u.email === selectedEmail);
                buyerInbox[selectedEmail].push({
                    sender: selectedEmail,
                    text: `Hey there! I'm ${student ? student.name.split(' ')[0] : 'a student'} from VVCE. Let's chat!`,
                    timestamp: 'Just now',
                    unread: true
                });
            }
            localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
        }

        this.closeModal('new-chat-modal');
        this.selectChatThread(selectedEmail);
        this.showToast("Conversation started!", "success");
    },

    // Dropdown Toggles
    toggleUserDropdown(e) {
        e.stopPropagation();
        const chip = document.getElementById('user-chip');
        chip.classList.toggle('active');
    },

    closeAllDropdowns() {
        const chip = document.getElementById('user-chip');
        if (chip) chip.classList.remove('active');
    },

    // 5. MARKETPLACE (BROWSE / SELL / WISHLIST)
    renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        // Show premium shimmer loader placeholders
        grid.innerHTML = `
            <div class="skeleton-loader-offers" style="grid-column: 1 / -1; height: 160px; margin-bottom: 1rem; border-radius:var(--radius-lg);"></div>
            <div class="skeleton-loader-offers" style="grid-column: 1 / -1; height: 160px; border-radius:var(--radius-lg);"></div>
        `;

        this.fetchOffers().then(() => {
            if (this.isSupabaseEnabled()) {
                supabaseClient.from("wishlists").select("*").eq("email", this.currentUser.email).maybeSingle().then(({ data: wishlistDoc, error: wishErr }) => {
                    if (wishErr) throw wishErr;
                    this.currentUserWishlist = wishlistDoc ? (wishlistDoc.product_ids || []) : [];
                    return supabaseClient.from("listings").select("*").order("created_at", { ascending: false });
                }).then(({ data: listingsData, error: listErr }) => {
                    if (listErr) throw listErr;
                    const listings = (listingsData || []).map(item => ({
                        ...item,
                        sellerName: item.seller_name,
                        sellerEmail: item.seller_email
                    }));
                    this.currentListingsCache = listings;
                    this.renderListingsToContainer(listings, grid);
                    
                    // Refresh active chat viewport if currently open
                    if (this.currentView === 'chat' && this.activeChatEmail) {
                        this.selectChatThread(this.activeChatEmail);
                    }
                }).catch((err) => {
                    console.error("Failed to load cloud listings & wishlist:", err);
                    this.showToast("Failed to load cloud listings", "error");
                });
            } else {
                const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
                this.renderListingsToContainer(listings, grid);
                
                // Refresh active chat viewport if currently open
                if (this.currentView === 'chat' && this.activeChatEmail) {
                    this.selectChatThread(this.activeChatEmail);
                }
            }
        }).catch(err => {
            console.error("Failed to fetch offers:", err);
            const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
            this.renderListingsToContainer(listings, grid);
            
            // Refresh active chat viewport if currently open
            if (this.currentView === 'chat' && this.activeChatEmail) {
                this.selectChatThread(this.activeChatEmail);
            }
        });
    },

    renderListingsToContainer(dataList, containerNode, isProfilePane = false) {
        containerNode.innerHTML = '';
        if (dataList.length === 0) {
            containerNode.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i data-lucide="package-x" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <h3>No items found</h3>
                    <p>Be the first to list an item in this category!</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        const wishlist = this.isSupabaseEnabled() ? 
            (this.currentUserWishlist || []) : 
            (JSON.parse(localStorage.getItem(`cl_wishlist_${this.currentUser.email}`)) || []);

        dataList.forEach(product => {
            const sellerEmail = product.sellerEmail || product.seller_email;
            const sellerName = product.sellerName || product.seller_name || "VVCE Student";

            const card = document.createElement('div');
            card.className = 'product-card glass-panel';
            
            const conditionClass = product.condition === 'New' ? 'new' : 'used';
            const isLiked = wishlist.includes(product.id);
            const heartClass = isLiked ? 'active' : '';

            const isOwner = sellerEmail === this.currentUser.email;

            // Check if there is an accepted offer for this item
            const acceptedOffer = (this.currentOffersCache || []).find(o => o.item_id === product.id && o.status === 'accepted');
            const isSold = !!acceptedOffer;

            let cardActions = '';
            if (isSold) {
                cardActions = `
                    <div style="display: flex; justify-content: center; width: 100%; margin-top: 0.75rem;">
                        <span class="product-badge-sold">
                            <i data-lucide="check-circle" style="width: 12px; height: 12px; color: var(--accent-yellow);"></i> Sold - Negotiated (₹${acceptedOffer.proposed_price})
                        </span>
                    </div>
                `;
            } else if (isOwner) {
                cardActions = `
                    <div class="product-owner-actions">
                        <button class="btn btn-secondary owner-btn" onclick="app.openEditListing('${product.id}')">
                            <i data-lucide="edit" style="width: 14px; height: 14px;"></i> Edit
                        </button>
                        <button class="btn btn-secondary owner-btn delete" onclick="app.deleteListing('${product.id}')">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete
                        </button>
                    </div>
                `;
            } else {
                cardActions = `
                    <div class="product-actions-btn-group" style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                        <div style="display: flex; gap: 0.5rem; width: 100%;">
                            <button class="btn btn-primary product-action-btn" onclick="app.buyContactItem('${product.id}')" style="flex: 1;">
                                <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Buy / Contact
                            </button>
                            <button class="btn btn-secondary product-action-btn" onclick="app.openNegotiateModal('${product.id}')" style="flex: 1; border-color: rgba(245, 200, 66, 0.4); background: rgba(245, 200, 66, 0.1); color: var(--accent-yellow);">
                                <i data-lucide="percent" style="width: 14px; height: 14px;"></i> Negotiate
                            </button>
                        </div>
                        <button class="btn btn-secondary product-action-btn ai-chat-btn" onclick="app.chatWithAiAboutListing('${product.id}')" style="width: 100%; border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.1); color: #818cf8;" title="Chat with AI Assistant">
                            <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> Ask AI
                        </button>
                    </div>
                `;
            }

            let pendingOffersHtml = '';
            if (isOwner && !isSold) {
                const itemOffers = (this.currentOffersCache || []).filter(o => o.item_id === product.id && o.status === 'pending');
                if (itemOffers.length > 0) {
                    pendingOffersHtml = `
                        <div class="product-pending-offers-list">
                            <div class="offer-header-title">Pending Offers</div>
                    `;
                    itemOffers.forEach(offer => {
                        pendingOffersHtml += `
                            <div class="offer-row-card">
                                <div style="display:flex; flex-direction:column; gap:2px; text-align:left;">
                                    <span style="font-weight:700; color:var(--text-main); font-size:0.8rem;">${offer.buyer_name}</span>
                                    <span style="color:var(--accent-yellow); font-weight:800; font-size:0.85rem;">₹${offer.proposed_price}</span>
                                </div>
                                <div class="offer-buttons-pills">
                                    <button class="btn-offer-action accept" onclick="app.acceptNegotiationOffer('${offer.id}', '${product.id}')">Accept</button>
                                    <button class="btn-offer-action decline" onclick="app.declineNegotiationOffer('${offer.id}')">Decline</button>
                                </div>
                            </div>
                        `;
                    });
                    pendingOffersHtml += `</div>`;
                }
            }

            const placeholderImg = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600";
            const productImg = product.image ? product.image : placeholderImg;

            card.innerHTML = `
                <button class="wishlist-btn ${heartClass}" onclick="app.toggleWishlist('${product.id}', event)">
                    <i data-lucide="heart" style="width: 16px; height: 16px; fill: ${isLiked ? 'currentColor' : 'none'};"></i>
                </button>
                <div class="product-image-container">
                    <span class="product-condition ${conditionClass}">${product.condition}</span>
                    <img src="${productImg}" alt="${product.title}" class="product-image" onerror="this.src='${placeholderImg}'">
                </div>
                <div class="product-details">
                    <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
                    <h3 class="product-title" title="${product.title}">${product.title}</h3>
                    <p class="text-sm text-muted" style="margin-bottom:0.75rem; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${product.description || ""}</p>
                    <div class="product-meta">
                        <div class="seller-info">
                            <i data-lucide="user" style="width: 14px; height: 14px;"></i>
                            <span>${sellerName}</span>
                        </div>
                        <span class="text-sm">${product.timestamp}</span>
                    </div>
                    ${cardActions}
                    ${pendingOffersHtml}
                </div>
            `;
            containerNode.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    },

    filterListings() {
        const listings = this.isSupabaseEnabled() ? 
            this.currentListingsCache : 
            (JSON.parse(localStorage.getItem('cl_listings')) || []);
        const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
        
        // Category radio filter
        const selectedRadio = document.querySelector('input[name="category"]:checked');
        const categoryVal = selectedRadio ? selectedRadio.value : 'all';

        // Price range inputs
        const minPrice = parseFloat(document.getElementById('filter-price-min').value) || 0;
        const maxPrice = parseFloat(document.getElementById('filter-price-max').value) || Infinity;

        // Condition check filters
        const conditionCheckboxes = Array.from(document.querySelectorAll('#browse-condition-filters input[type="checkbox"]:checked'));
        const checkedConditions = conditionCheckboxes.map(cb => cb.value);

        // Filter Logic
        let filtered = listings.filter(item => {
            const matchesSearch = (item.title || '').toLowerCase().includes(searchVal) || 
                                  (item.description || '').toLowerCase().includes(searchVal) ||
                                  (item.category || '').toLowerCase().includes(searchVal);
            
            const matchesCategory = (categoryVal === 'all') || (item.category === categoryVal);
            
            const matchesPrice = (item.price >= minPrice) && (item.price <= maxPrice);
            
            const matchesCondition = (checkedConditions.length === 0) || checkedConditions.includes(item.condition);

            return matchesSearch && matchesCategory && matchesPrice && matchesCondition;
        });

        if (this.showWishlistOnly) {
            const wishlist = this.isSupabaseEnabled() ? 
                (this.currentUserWishlist || []) : 
                (JSON.parse(localStorage.getItem(`cl_wishlist_${this.currentUser.email}`)) || []);
            filtered = filtered.filter(item => wishlist.includes(item.id));
        }

        // Sort Selection
        const sortSelect = document.getElementById('sort-select');
        const sortVal = sortSelect ? sortSelect.value : 'newest';
        
        if (sortVal === 'low-to-high') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortVal === 'high-to-low') {
            filtered.sort((a, b) => b.price - a.price);
        } else {
            // Newest first - by ID reverse
            filtered.sort((a, b) => b.id - a.id);
        }

        const grid = document.getElementById('products-grid');
        this.renderListingsToContainer(filtered, grid);
    },

    toggleWishlist(productId, event) {
        event.stopPropagation();
        
        const rerenderWishlist = () => {
            if (this.currentView === 'browse') {
                this.filterListings();
            } else if (this.currentView === 'profile') {
                this.renderProfile();
            }
        };

        if (this.isSupabaseEnabled()) {
            const idx = this.currentUserWishlist.indexOf(productId);
            if (idx > -1) {
                this.currentUserWishlist.splice(idx, 1);
                this.showToast("Removed from wishlist", "info");
            } else {
                this.currentUserWishlist.push(productId);
                this.showToast("Added to wishlist", "success");
            }
            supabaseClient.from("wishlists").upsert({
                email: this.currentUser.email,
                product_ids: this.currentUserWishlist
            }).then(({ error }) => {
                if (error) throw error;
                rerenderWishlist();
            }).catch((err) => {
                console.error("Failed to update cloud wishlist:", err);
            });
        } else {
            const key = `cl_wishlist_${this.currentUser.email}`;
            let wishlist = JSON.parse(localStorage.getItem(key)) || [];
            
            const idx = wishlist.indexOf(productId);
            if (idx > -1) {
                wishlist.splice(idx, 1);
                this.showToast("Removed from wishlist", "info");
            } else {
                wishlist.push(productId);
                this.showToast("Added to wishlist", "success");
            }
            localStorage.setItem(key, JSON.stringify(wishlist));
            rerenderWishlist();
        }
    },

    deleteListing(productId) {
        if (confirm("Are you sure you want to delete this listing?")) {
            const refreshUI = () => {
                this.showToast("Item deleted successfully", "success");
                if (this.currentView === 'browse') {
                    this.renderProducts();
                } else if (this.currentView === 'profile') {
                    this.renderProfile();
                }
            };

            if (this.isSupabaseEnabled()) {
                supabaseClient.from("listings").delete().eq("id", productId).then(({ error }) => {
                    if (error) throw error;
                    refreshUI();
                }).catch((err) => {
                    console.error("Failed to delete listing in Supabase:", err);
                    this.showToast("Failed to delete cloud listing", "error");
                });
            } else {
                let listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
                listings = listings.filter(item => String(item.id) !== String(productId));
                localStorage.setItem('cl_listings', JSON.stringify(listings));
                refreshUI();
            }
        }
    },

    openEditListing(productId) {
        const listings = this.isSupabaseEnabled() ? this.currentListingsCache : (JSON.parse(localStorage.getItem('cl_listings')) || []);
        const item = listings.find(i => String(i.id) === String(productId));
        if (!item) return;

        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-item-title').value = item.title;
        document.getElementById('edit-item-price').value = item.price;
        document.getElementById('edit-item-category').value = item.category;
        
        if (item.condition === 'New') document.getElementById('edit-cond-new').checked = true;
        else if (item.condition === 'Like New') document.getElementById('edit-cond-likenew').checked = true;
        else document.getElementById('edit-cond-used').checked = true;

        document.getElementById('edit-item-desc').value = item.description || "";

        this.openModal('edit-listing-modal');
    },

    buyContactItem(productId) {
        const listings = (this.currentListingsCache && this.currentListingsCache.length > 0) ? 
            this.currentListingsCache : 
            (JSON.parse(localStorage.getItem('cl_listings')) || []);
        const product = listings.find(p => String(p.id) === String(productId));
        if (!product) {
            this.showToast("Listing details not found", "error");
            return;
        }

        const sellerEmail = product.sellerEmail || product.seller_email;
        const sellerName = product.sellerName || product.seller_name || "VVCE Student";
        
        if (sellerEmail === this.currentUser.email) {
            this.showToast("You cannot purchase your own item!", "error");
            return;
        }

        if (this.isSupabaseEnabled()) {
            const roomId = this.getChatRoomId(this.currentUser.email, sellerEmail);
            supabaseClient.from("chats").select("*").eq("room_id", roomId).maybeSingle().then(({ data: chatDoc, error }) => {
                if (error) throw error;
                if (!chatDoc || !chatDoc.messages || chatDoc.messages.length === 0) {
                    const introMsg = {
                        sender: this.currentUser.email,
                        text: `Hi! I am interested in your item: "${product.title}" (listed for ₹${product.price}). Is it still available?`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        unread: true
                    };
                    return supabaseClient.from("chats").upsert({
                        room_id: roomId,
                        user_a: this.currentUser.email,
                        user_b: sellerEmail,
                        messages: [introMsg]
                    });
                }
            }).then(() => {
                this.showToast("Message sent to seller! Redirecting to chat...", "success");
                this.activeChatEmail = sellerEmail;
                setTimeout(() => {
                    this.navigate('chat');
                }, 500);
            }).catch((err) => {
                console.error("Failed to contact seller in Supabase:", err);
                this.showToast("Failed to connect with seller", "error");
            });
        } else {
            const buyerInboxKey = `cl_messages_${this.currentUser.email}`;
            const sellerInboxKey = `cl_messages_${sellerEmail}`;

            let buyerInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};
            let sellerInbox = JSON.parse(localStorage.getItem(sellerInboxKey)) || {};

            if (!buyerInbox[sellerEmail]) buyerInbox[sellerEmail] = [];
            if (!sellerInbox[this.currentUser.email]) sellerInbox[this.currentUser.email] = [];

            if (buyerInbox[sellerEmail].length === 0) {
                const introMsg = {
                    sender: this.currentUser.email,
                    text: `Hi! I am interested in your item: "${product.title}" (listed for ₹${product.price}). Is it still available?`,
                    timestamp: "Just now",
                    unread: true
                };
                buyerInbox[sellerEmail].push(introMsg);
                
                const sellerIntroMsg = { ...introMsg, unread: true };
                sellerInbox[this.currentUser.email].push(sellerIntroMsg);

                localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
                localStorage.setItem(sellerInboxKey, JSON.stringify(sellerInbox));
            }

            this.showToast("Message sent to seller! Redirecting to chat...", "success");
            this.activeChatEmail = sellerEmail;
            setTimeout(() => {
                this.navigate('chat');
            }, 500);
        }
    },

    // 6. COLLABBOARD (TEAMS)
    renderTeams() {
        const grid = document.getElementById('collab-teams-grid');
        if (!grid) return;

        const renderTeamsData = (teams) => {
            // Compute unique skills chips dynamically
            this.renderSkillFilterChips(teams);

            // Filter based on active skill filter chip
            const activeChip = document.querySelector('.skill-chip.active');
            const filterSkill = activeChip ? activeChip.getAttribute('data-skill') : 'all';

            let dataToRender = teams;
            if (filterSkill !== 'all') {
                dataToRender = teams.filter(t => {
                    const skillsArr = this.parseArrayField(t.skills).map(s => s.toLowerCase());
                    return skillsArr.includes(filterSkill.toLowerCase());
                });
            }

            grid.innerHTML = '';
            if (dataToRender.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                        <i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                        <h3>No teams found</h3>
                        <p>Create a project team and recruit engineering colleagues!</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            dataToRender.forEach(team => {
                const card = document.createElement('div');
                card.className = 'feature-card glass-panel team-card';
                
                // Skill tags
                const skillsArr = this.parseArrayField(team.skills);
                if (skillsArr.length === 0) skillsArr.push('General');
                let skillsBadges = skillsArr.map(s => `<span class="tag-badge skill">${s}</span>`).join('');

                // Open Roles tags
                const rolesArr = this.parseArrayField(team.openRoles || team.open_roles);
                if (rolesArr.length === 0) rolesArr.push('Open');
                let rolesBadges = rolesArr.map(r => `<span class="tag-badge role">${r}</span>`).join('');

                const isOwner = team.createdByEmail === this.currentUser.email;
                const appliedList = team.applicants || [];
                const hasApplied = appliedList.some(app => app.email === this.currentUser.email);

                let actionBtn = '';
                if (isOwner) {
                    const count = appliedList.length;
                    const badgeStr = count > 0 ? ` <span class="badge-count" style="margin-left:5px;">${count}</span>` : '';
                    actionBtn = `
                        <div style="display:flex; gap:0.5rem; margin-top:auto;">
                            <button class="btn btn-primary" onclick="app.openManageApplicants('${team.id}')" style="flex:1;">Manage${badgeStr}</button>
                            <button class="btn" onclick="app.deleteTeam('${team.id}')" title="Delete Team"
                                style="background:rgba(255,80,80,0.15); color:#ff5050; border:1px solid rgba(255,80,80,0.4); padding:0 0.75rem; border-radius:8px; cursor:pointer; transition:all 0.2s;"
                                onmouseover="this.style.background='rgba(255,80,80,0.3)'" onmouseout="this.style.background='rgba(255,80,80,0.15)'">
                                <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
                            </button>
                        </div>`;
                } else if (hasApplied) {
                    actionBtn = `<button class="btn btn-secondary" style="width:100%; margin-top: auto;" disabled>Application Sent</button>`;
                } else {
                    actionBtn = `<button class="btn btn-primary" onclick="app.applyToTeam('${team.id}')" style="width:100%; margin-top: auto;">Apply / Join</button>`;
                }

                card.innerHTML = `
                    <div style="text-align: left; height: 100%; display: flex; flex-direction: column;">
                        <div class="team-card-header">
                            <h3 style="margin-bottom:0; text-align: left;">${team.teamName}</h3>
                        </div>
                        <div class="team-creator">
                            <i data-lucide="user" style="width:12px; height:12px;"></i>
                            <span>Created by: ${team.createdBy}</span>
                        </div>
                        <p style="color: var(--text-muted); font-size:0.9rem; margin-top: 1rem; margin-bottom: 1rem; line-height:1.5;">${team.description}</p>
                        
                        <div style="margin-top:auto;">
                            <div style="font-weight:600; font-size:0.85rem; color:var(--text-main);">Required Skills:</div>
                            <div class="tag-list">${skillsBadges}</div>
                            
                            <div style="font-weight:600; font-size:0.85rem; color:var(--text-main); margin-top: 0.5rem;">Open Roles:</div>
                            <div class="tag-list">${rolesBadges}</div>
                        </div>
                        
                        <div style="margin-top: 1.5rem;">
                            ${actionBtn}
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("teams").select("*").then(({ data: teamsData, error }) => {
                if (error) throw error;
                const teams = (teamsData || []).map(t => ({
                    ...t,
                    teamName: t.team_name,
                    openRoles: t.open_roles,
                    createdBy: t.created_by,
                    createdByEmail: t.created_by_email
                }));
                this.currentTeamsCache = teams;
                renderTeamsData(teams);
            }).catch((err) => {
                console.error("Failed to load cloud teams:", err);
                this.showToast("Failed to load cloud teams", "error");
            });
        } else {
            const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
            this.currentTeamsCache = teams;
            renderTeamsData(teams);
        }
    },

    renderSkillFilterChips(teams) {
        const container = document.getElementById('collab-skills-filters');
        if (!container) return;

        // Keep active skill tag
        const activeChip = container.querySelector('.skill-chip.active');
        const activeSkill = activeChip ? activeChip.getAttribute('data-skill') : 'all';

        // Extract all unique skills
        let allSkills = new Set();
        teams.forEach(t => {
            this.parseArrayField(t.skills).forEach(s => {
                const skill = s.trim();
                if (skill !== '') allSkills.add(skill);
            });
        });

        container.innerHTML = '';
        
        // Add "All Skills" chip
        const allChip = document.createElement('div');
        allChip.className = `skill-chip ${activeSkill === 'all' ? 'active' : ''}`;
        allChip.setAttribute('data-skill', 'all');
        allChip.textContent = 'All Skills';
        allChip.onclick = (e) => this.selectSkillChip('all', e);
        container.appendChild(allChip);

        allSkills.forEach(skill => {
            const chip = document.createElement('div');
            chip.className = `skill-chip ${activeSkill === skill ? 'active' : ''}`;
            chip.setAttribute('data-skill', skill);
            chip.textContent = skill;
            chip.onclick = (e) => this.selectSkillChip(skill, e);
            container.appendChild(chip);
        });
    },

    selectSkillChip(skill, event) {
        document.querySelectorAll('.skill-chip').forEach(el => el.classList.remove('active'));
        event.target.classList.add('active');
        this.renderTeams();
    },

    applyToTeam(teamId) {
        const teams = this.isSupabaseEnabled() ? this.currentTeamsCache : (JSON.parse(localStorage.getItem('cl_teams')) || []);
        const team = teams.find(t => String(t.id) === String(teamId));
        if (!team) return;

        if (team.createdByEmail === this.currentUser.email) {
            this.showToast("You cannot apply to your own team!", "error");
            return;
        }

        if (!team.applicants) team.applicants = [];

        // Check if already applied
        const alreadyApplied = team.applicants.some(app => app.email === this.currentUser.email);
        if (alreadyApplied) {
            this.showToast("You have already applied!", "info");
            return;
        }

        const newApplicant = {
            name: this.currentUser.name,
            email: this.currentUser.email,
            branch: this.currentUser.branch,
            semester: this.currentUser.semester,
            phone: this.currentUser.phone
        };

        const updatedApplicants = [...team.applicants, newApplicant];

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("teams").update({
                applicants: updatedApplicants
            }).eq("id", teamId).then(({ error }) => {
                if (error) throw error;
                this.showToast("Application sent to team leader!", "success");
                this.renderTeams();
            }).catch((err) => {
                console.error("Failed to apply to team in Supabase:", err);
                this.showToast("Failed to apply to team", "error");
            });
        } else {
            team.applicants.push(newApplicant);
            localStorage.setItem('cl_teams', JSON.stringify(teams));
            this.showToast("Application sent to team leader!", "success");
            this.renderTeams();
        }
    },

    openManageApplicants(teamId) {
        const teams = this.isSupabaseEnabled() ? this.currentTeamsCache : (JSON.parse(localStorage.getItem('cl_teams')) || []);
        const team = teams.find(t => String(t.id) === String(teamId));
        if (!team) return;

        document.getElementById('manage-modal-title').textContent = `Applicants: ${team.teamName}`;
        const container = document.getElementById('applicants-list-container');
        container.innerHTML = '';

        const applicants = team.applicants || [];
        if (applicants.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 2rem; color:var(--text-muted);">
                    <i data-lucide="info" style="width: 32px; height:32px; margin-bottom: 10px;"></i>
                    <p>No applicants have joined yet.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            this.openModal('manage-applicants-modal');
            return;
        }

        applicants.forEach(app => {
            const card = document.createElement('div');
            card.className = 'applicant-card';
            card.innerHTML = `
                <div class="applicant-info">
                    <h5>${app.name}</h5>
                    <p>${app.branch} | Semester ${app.semester} | Email: ${app.email}</p>
                    <p style="margin-top:5px; font-weight:600;"><i data-lucide="phone" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${app.phone}</p>
                </div>
                <div>
                    <a href="tel:${app.phone}" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"><i data-lucide="phone" style="width:14px; height:14px;"></i> Call</a>
                </div>
            `;
            container.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
        this.openModal('manage-applicants-modal');
    },

    deleteTeam(teamId) {
        const teams = this.isSupabaseEnabled() ? this.currentTeamsCache : (JSON.parse(localStorage.getItem('cl_teams')) || []);
        const team = teams.find(t => String(t.id) === String(teamId));
        if (!team) return;

        // Safety: only owner can delete
        if (team.createdByEmail !== this.currentUser.email) {
            this.showToast("You can only delete teams you created.", "error");
            return;
        }

        // Populate confirmation modal
        document.getElementById('delete-team-name-label').textContent = `"${team.teamName}"`;
        document.getElementById('delete-team-id-input').value = teamId;
        if (window.lucide) lucide.createIcons();
        this.openModal('delete-team-modal');
    },

    confirmDeleteTeam() {
        const teamId = document.getElementById('delete-team-id-input').value;
        if (!teamId) return;

        // Disable button while deleting
        const btn = document.getElementById('confirm-delete-team-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("teams").delete().eq("id", teamId).then(({ error }) => {
                if (error) throw error;
                this.closeModal('delete-team-modal');
                this.showToast("Team deleted successfully.", "success");
                this.renderTeams();
            }).catch((err) => {
                console.error("Failed to delete team from Supabase:", err);
                this.showToast("Failed to delete team. Please try again.", "error");
                if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="trash-2" style="width:14px;height:14px;"></i> Yes, Delete'; }
                if (window.lucide) lucide.createIcons();
            });
        } else {
            let teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
            // Convert to number for comparison (local IDs are numbers)
            teams = teams.filter(t => String(t.id) !== String(teamId));
            localStorage.setItem('cl_teams', JSON.stringify(teams));
            this.currentTeamsCache = teams;
            this.closeModal('delete-team-modal');
            this.showToast("Team deleted successfully.", "success");
            this.renderTeams();
        }
    },

    // 7. HACKATHONS PAGE
    renderHackathons() {
        const grid = document.getElementById('hackathons-grid');
        if (!grid) return;

        const hackathons = JSON.parse(localStorage.getItem('cl_hackathons')) || [];

        const renderHackathonsData = (registrations) => {
            // Update statistics
            document.getElementById('hack-stat-count').textContent = hackathons.filter(h => h.status !== 'ended').length;
            document.getElementById('hack-stat-registrations').textContent = registrations.length;
            
            let prizeSum = 0;
            hackathons.forEach(h => {
                const numericVal = parseInt((h.prizePool || '').replace(/[^0-9]/g, '')) || 0;
                prizeSum += numericVal;
            });
            document.getElementById('hack-stat-prizes').textContent = `₹${(prizeSum / 100000).toFixed(1)} Lakhs`;

            grid.innerHTML = '';
            hackathons.forEach(hack => {
                const card = document.createElement('div');
                card.className = 'hackathon-card glass-panel';

                let tagText = 'Registering';
                let tagClass = 'registering';
                if (hack.status === 'upcoming') {
                    tagText = 'Upcoming';
                    tagClass = 'upcoming';
                } else if (hack.status === 'ended') {
                    tagText = 'Ended';
                    tagClass = 'ended';
                }

                const regCount = registrations.filter(r => r.hackathonId === hack.id).length;
                const hasRegistered = registrations.some(r => r.hackathonId === hack.id && r.userEmail === this.currentUser.email);

                let actionBtn = '';
                if (hack.status === 'ended') {
                    actionBtn = `<button class="btn btn-secondary" style="width: 100%;" disabled>Ended</button>`;
                } else if (hasRegistered) {
                    actionBtn = `<button class="btn btn-secondary" style="width: 100%; border-color: #34d399; color: #34d399;" disabled><i data-lucide="check-circle" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> Registered</button>`;
                } else {
                    actionBtn = `<button class="btn btn-primary" onclick="app.openRegisterHackathon('${hack.id}')" style="width: 100%;">Register Team</button>`;
                }

                // Timeline HTML
                let timelineHtml = '';
                if (hack.timeline) {
                    timelineHtml = hack.timeline.map(step => `
                        <div class="timeline-step ${step.active ? 'active' : ''}">
                            <div class="timeline-title">${step.title}</div>
                            <div class="timeline-date">${step.date}</div>
                        </div>
                    `).join('');
                }

                card.innerHTML = `
                    <div class="hackathon-banner" style="background-image: url('${hack.bannerImage}')">
                        <div class="hackathon-banner-overlay"></div>
                        <span class="hackathon-tag ${tagClass}">${tagText}</span>
                    </div>
                    <div class="hackathon-body">
                        <div class="hackathon-organizer">${hack.organizer}</div>
                        <h3 style="margin-bottom:0.5rem; text-align:left;">${hack.title}</h3>
                        <p class="text-sm text-muted" style="line-height:1.5; margin-bottom:1rem;">${hack.details}</p>
                        
                        <div class="hackathon-prize-badge">
                            <i data-lucide="trophy" style="width: 16px; height: 16px;"></i> Pool: ${hack.prizePool}
                        </div>

                        <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); margin-top: 1.5rem;">Schedules & Deadlines:</div>
                        <div class="hackathon-timeline">
                            ${timelineHtml}
                        </div>

                        <div class="hackathon-info-row" style="margin-top:auto;">
                            <span class="hackathon-info-item"><i data-lucide="users" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${regCount + hack.activeRegistrations} Teams Joined</span>
                            <span class="hackathon-info-item"><i data-lucide="calendar" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${hack.dates}</span>
                        </div>

                        <div style="margin-top: 1.5rem;">
                            ${actionBtn}
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("hackathon_registrations").select("*").then(({ data: regsData, error }) => {
                if (error) throw error;
                const regs = (regsData || []).map(r => ({
                    ...r,
                    hackathonId: r.hackathon_id,
                    userEmail: r.user_email
                }));
                renderHackathonsData(regs);
            }).catch((err) => {
                console.error("Failed to load cloud hackathon registrations:", err);
                this.showToast("Failed to load cloud hackathon registrations", "error");
            });
        } else {
            const registrations = JSON.parse(localStorage.getItem('cl_hackathon_registrations')) || [];
            renderHackathonsData(registrations);
        }
    },

    openRegisterHackathon(hackId) {
        const hackathons = JSON.parse(localStorage.getItem('cl_hackathons')) || [];
        const hack = hackathons.find(h => String(h.id) === String(hackId));
        if (!hack) return;

        document.getElementById('reg-hackathon-id').value = hack.id;
        document.getElementById('hack-reg-title').textContent = `Register Team: ${hack.title}`;
        
        document.getElementById('reg-team-name').value = '';
        document.getElementById('reg-members').value = `${this.currentUser.name} (${this.currentUser.branch})`;
        document.getElementById('reg-phone').value = this.currentUser.phone;

        this.openModal('register-hackathon-modal');
    },

    // 8. REDDIT COMMUNITY HUB
    renderRedditPosts() {
        const feed = document.getElementById('reddit-posts-feed');
        if (!feed) return;

        // Upgrades sidebar active classes
        document.querySelectorAll('.subreddit-item').forEach(el => {
            el.classList.remove('active');
            const onclickAttr = el.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/'([^']+)'/);
                if (match) {
                    const sub = match[1];
                    if (sub === this.activeSubreddit) el.classList.add('active');
                }
            }
        });

        // Filter subreddit & search
        const searchInput = document.getElementById('reddit-search-input');
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (searchInput) {
            searchInput.placeholder = this.activeSubreddit === 'all' ? "Search threads in r/all..." : `Search threads in r/${this.activeSubreddit}...`;
        }

        const processRedditData = (posts) => {
            let filtered = posts.filter(post => {
                const matchesSub = (this.activeSubreddit === 'all') || (post.subreddit === this.activeSubreddit);
                const matchesSearch = post.title.toLowerCase().includes(searchVal) ||
                                      post.body.toLowerCase().includes(searchVal) ||
                                      post.flair.toLowerCase().includes(searchVal);
                return matchesSub && matchesSearch;
            });

            // Sorting Logic
            if (this.activeRedditSort === 'new') {
                filtered.sort((a, b) => b.id - a.id);
            } else if (this.activeRedditSort === 'top') {
                filtered.sort((a, b) => {
                    const scoreA = (a.upvotes || []).length - (a.downvotes || []).length;
                    const scoreB = (b.upvotes || []).length - (b.downvotes || []).length;
                    return scoreB - scoreA;
                });
            } else {
                // Hot formula: (Upvotes - Downvotes) + CommentsCount * 3
                filtered.sort((a, b) => {
                    const hotA = ((a.upvotes || []).length - (a.downvotes || []).length) + (a.commentsCount || 0) * 3;
                    const hotB = ((b.upvotes || []).length - (b.downvotes || []).length) + (b.commentsCount || 0) * 3;
                    return hotB - hotA;
                });
            }

            feed.innerHTML = '';
            if (filtered.length === 0) {
                feed.innerHTML = `
                    <div style="text-align: center; padding: 4rem; color: var(--text-muted);" class="glass-panel">
                        <i data-lucide="message-square" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                        <h3>No posts inside r/${this.activeSubreddit}</h3>
                        <p>Be the first to publish a discussion thread here!</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            filtered.forEach(post => {
                const card = document.createElement('div');
                card.className = 'product-card glass-panel reddit-post-card';

                const userUpvoted = (post.upvotes || []).includes(this.currentUser.email);
                const userDownvoted = (post.downvotes || []).includes(this.currentUser.email);
                const score = (post.upvotes || []).length - (post.downvotes || []).length;

                const upClass = userUpvoted ? 'active' : '';
                const downClass = userDownvoted ? 'active' : '';

                // Author metadata badges
                let authorBadge = '';
                if (post.authorEmail === 'neha@vvce.ac.in') {
                    authorBadge = `<span class="reddit-author-badge moderator"><i data-lucide="shield" style="width:10px; height:10px;"></i> Mod</span>`;
                } else if (post.authorEmail === this.currentUser.email) {
                    authorBadge = `<span class="reddit-author-badge"><i data-lucide="user" style="width:10px; height:10px;"></i> Me</span>`;
                }

                const isAuthor = post.authorEmail === this.currentUser.email;
                const deleteBtn = isAuthor ? `
                    <button class="reddit-action-btn delete-btn" onclick="app.deleteRedditPost('${post.id}')">
                        <i data-lucide="trash-2" style="width: 12px; height:12px;"></i> Delete
                    </button>
                ` : '';

                const commentCount = this.isSupabaseEnabled() ? (post.commentsCount || 0) : (JSON.parse(localStorage.getItem(`cl_reddit_comments_${post.id}`)) || []).length;

                card.innerHTML = `
                    <div class="reddit-upvote-panel">
                        <button class="vote-arrow up ${upClass}" onclick="app.voteRedditPost('${post.id}', 1)">
                            <i data-lucide="arrow-up" style="width: 20px; height: 20px;"></i>
                        </button>
                        <span class="vote-count" style="font-size:0.85rem;">${score}</span>
                        <button class="vote-arrow down ${downClass}" onclick="app.voteRedditPost('${post.id}', -1)">
                            <i data-lucide="arrow-down" style="width: 20px; height: 20px;"></i>
                        </button>
                    </div>
                    <div class="reddit-post-main">
                        <div class="reddit-post-byline">
                            <span class="reddit-subreddit-name" onclick="app.selectSubreddit('${post.subreddit}', event)">r/${post.subreddit}</span>
                            <span>• Posted by ${post.authorName}</span>
                            ${authorBadge}
                            <span>• ${post.timestamp}</span>
                        </div>

                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.5rem;">
                            <span class="flair ${post.flair.toLowerCase()}" style="font-size:0.65rem;">${post.flair}</span>
                            <h3 class="reddit-post-title" style="margin-bottom:0; text-align:left;">${post.title}</h3>
                        </div>

                        <p class="reddit-post-body">${post.body}</p>

                        <div class="reddit-post-footer">
                            <button class="reddit-action-btn" onclick="app.toggleRedditComments('${post.id}')">
                                <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
                                <span>${commentCount} Comment${commentCount === 1 ? '' : 's'}</span>
                            </button>
                            ${deleteBtn}
                        </div>

                        <!-- Threaded comments drawer -->
                        <div class="post-comments-drawer" id="reddit-comments-drawer-${post.id}">
                            <form class="comment-input-area" onsubmit="app.submitRedditComment('${post.id}', event)" style="margin-top: 1rem;">
                                <input type="text" id="reddit-comment-input-${post.id}" class="form-control" placeholder="Add a public reply..." required autocomplete="off">
                                <button type="submit" class="btn btn-primary" style="padding:0.5rem 1rem;"><i data-lucide="corner-down-left"></i></button>
                            </form>
                            <div class="comments-list" id="reddit-comments-list-${post.id}">
                                <!-- Dynamic nested nodes -->
                            </div>
                        </div>
                    </div>
                `;
                feed.appendChild(card);
                this.renderRedditCommentsList(post.id);
            });

            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("reddit_posts").select("*").then(({ data: postsData, error }) => {
                if (error) throw error;
                const posts = (postsData || []).map(p => ({
                    ...p,
                    authorName: p.author_name,
                    authorEmail: p.author_email,
                    commentsCount: p.comments_count
                }));
                this.currentRedditPostsCache = posts;
                processRedditData(posts);
            }).catch((err) => {
                console.error("Failed to load cloud reddit posts:", err);
                this.showToast("Failed to load cloud posts", "error");
            });
        } else {
            const posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
            this.currentRedditPostsCache = posts;
            processRedditData(posts);
        }
    },

    selectSubreddit(subName, event) {
        if (event) {
            event.stopPropagation();
        }
        this.activeSubreddit = subName;
        this.renderRedditPosts();
    },

    sortReddit(sortName) {
        this.activeRedditSort = sortName;
        document.querySelectorAll('.reddit-sort-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`sort-reddit-${sortName}`).classList.add('active');
        this.renderRedditPosts();
    },

    filterRedditPosts() {
        this.renderRedditPosts();
    },

    voteRedditPost(postId, direction) {
        if (this.isSupabaseEnabled()) {
            supabaseClient.from("reddit_posts").select("*").eq("id", postId).maybeSingle().then(({ data: post, error }) => {
                if (error || !post) throw error || new Error("Post not found");
                
                let upvotes = post.upvotes || [];
                let downvotes = post.downvotes || [];
                const email = this.currentUser.email;

                if (direction === 1) {
                    const idx = upvotes.indexOf(email);
                    if (idx > -1) {
                        upvotes = upvotes.filter(e => e !== email);
                    } else {
                        upvotes.push(email);
                        downvotes = downvotes.filter(e => e !== email);
                    }
                } else {
                    const idx = downvotes.indexOf(email);
                    if (idx > -1) {
                        downvotes = downvotes.filter(e => e !== email);
                    } else {
                        downvotes.push(email);
                        upvotes = upvotes.filter(e => e !== email);
                    }
                }

                return supabaseClient.from("reddit_posts").update({ upvotes, downvotes }).eq("id", postId);
            }).then(({ error }) => {
                if (error) throw error;
                this.renderRedditPosts();
            }).catch((err) => {
                console.error("Failed to vote in Supabase:", err);
            });
        } else {
            let posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
            const post = posts.find(p => String(p.id) === String(postId));
            if (!post) return;

            const email = this.currentUser.email;
            if (!post.upvotes) post.upvotes = [];
            if (!post.downvotes) post.downvotes = [];

            if (direction === 1) {
                const idx = post.upvotes.indexOf(email);
                if (idx > -1) {
                    post.upvotes.splice(idx, 1);
                } else {
                    post.upvotes.push(email);
                    const downIdx = post.downvotes.indexOf(email);
                    if (downIdx > -1) post.downvotes.splice(downIdx, 1);
                }
            } else {
                const idx = post.downvotes.indexOf(email);
                if (idx > -1) {
                    post.downvotes.splice(idx, 1);
                } else {
                    post.downvotes.push(email);
                    const upIdx = post.upvotes.indexOf(email);
                    if (upIdx > -1) post.upvotes.splice(upIdx, 1);
                }
            }

            localStorage.setItem('cl_reddit_posts', JSON.stringify(posts));
            this.renderRedditPosts();
        }
    },

    toggleRedditComments(postId) {
        const drawer = document.getElementById(`reddit-comments-drawer-${postId}`);
        if (!drawer) return;
        drawer.classList.toggle('active');
        if (drawer.classList.contains('active')) {
            this.renderRedditCommentsList(postId);
        }
    },

    renderRedditCommentsList(postId) {
        const container = document.getElementById(`reddit-comments-list-${postId}`);
        if (!container) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("reddit_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true }).then(({ data: commentsData, error }) => {
                if (error) throw error;
                const comments = (commentsData || []).map(c => ({
                    ...c,
                    authorName: c.author_name,
                    authorEmail: c.author_email
                }));
                this.renderCommentsToContainer(comments, container);
            }).catch((err) => {
                console.error("Failed to load cloud comments:", err);
            });
        } else {
            const comments = JSON.parse(localStorage.getItem(`cl_reddit_comments_${postId}`)) || [];
            this.renderCommentsToContainer(comments, container);
        }
    },

    renderCommentsToContainer(comments, container) {
        container.innerHTML = '';
        if (comments.length === 0) {
            container.innerHTML = `<p class="text-sm text-muted italic" style="padding: 0.5rem 0;">No comments yet. Be the first to reply!</p>`;
            return;
        }

        comments.forEach(comment => {
            const node = document.createElement('div');
            node.className = 'comment-node';
            node.innerHTML = `
                <div class="comment-meta">
                    <span style="font-weight: 700; color:var(--text-main);">${comment.authorName}</span>
                    <span>${comment.timestamp || 'Just now'}</span>
                </div>
                <div class="comment-body" style="font-size:0.875rem;">${comment.body}</div>
            `;
            container.appendChild(node);
        });
    },

    submitRedditComment(postId, event) {
        event.preventDefault();
        const input = document.getElementById(`reddit-comment-input-${postId}`);
        if (!input) return;

        const text = input.value.trim();
        if (text === '') return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from("reddit_comments").insert({
                post_id: postId,
                author_name: this.currentUser.name,
                author_email: this.currentUser.email,
                body: text,
                timestamp: "Just now"
            }).then(({ error }) => {
                if (error) throw error;
                return supabaseClient.from("reddit_posts").select("comments_count").eq("id", postId).maybeSingle();
            }).then(({ data: post, error }) => {
                if (error) throw error;
                const newCount = (post ? post.comments_count : 0) + 1;
                return supabaseClient.from("reddit_posts").update({ comments_count: newCount }).eq("id", postId);
            }).then(({ error }) => {
                if (error) throw error;
                input.value = '';
                this.showToast("Comment published!", "success");
                this.renderRedditCommentsList(postId);
                this.renderRedditPosts();
            }).catch((err) => {
                console.error("Failed to submit cloud comment:", err);
                this.showToast("Failed to submit comment", "error");
            });
        } else {
            const commentsKey = `cl_reddit_comments_${postId}`;
            let comments = JSON.parse(localStorage.getItem(commentsKey)) || [];

            const newComment = {
                id: comments.length + 1,
                authorName: this.currentUser.name,
                authorEmail: this.currentUser.email,
                body: text,
                timestamp: "Just now"
            };

            comments.push(newComment);
            localStorage.setItem(commentsKey, JSON.stringify(comments));

            // Increment comments count in post
            let posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
            const idx = posts.findIndex(p => String(p.id) === String(postId));
            if (idx > -1) {
                posts[idx].commentsCount = (posts[idx].commentsCount || 0) + 1;
                localStorage.setItem('cl_reddit_posts', JSON.stringify(posts));
            }

            input.value = '';
            this.showToast("Comment published!", "success");
            
            this.renderRedditCommentsList(postId);
            this.renderRedditPosts();
        }
    },

    deleteRedditPost(postId) {
        if (confirm("Are you sure you want to delete this community thread?")) {
            const refreshUI = () => {
                this.showToast("Post deleted successfully", "success");
                if (this.currentView === 'reddit') {
                    this.renderRedditPosts();
                } else if (this.currentView === 'profile') {
                    this.renderProfile();
                }
            };

            if (this.isSupabaseEnabled()) {
                supabaseClient.from("reddit_posts").delete().eq("id", postId).then(({ error }) => {
                    if (error) throw error;
                    return supabaseClient.from("reddit_comments").delete().eq("post_id", postId);
                }).then(({ error }) => {
                    if (error) throw error;
                    refreshUI();
                }).catch((err) => {
                    console.error("Failed to delete post in Supabase:", err);
                    this.showToast("Failed to delete cloud post", "error");
                });
            } else {
                let posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
                posts = posts.filter(p => p.id !== postId);
                localStorage.setItem('cl_reddit_posts', JSON.stringify(posts));
                
                localStorage.removeItem(`cl_reddit_comments_${postId}`);
                this.showToast("Post deleted successfully", "success");
                
                if (this.currentView === 'reddit') {
                    this.renderRedditPosts();
                } else if (this.currentView === 'profile') {
                    this.renderProfile();
                }
            }
        }
    },

    renderProfile() {
        // Personal info
        document.getElementById('profile-avatar-large').textContent = this.currentUser.name[0].toUpperCase();
        document.getElementById('profile-full-name').textContent = this.currentUser.name;
        document.getElementById('profile-branch-sem').textContent = `${this.currentUser.branch} | Semester ${this.currentUser.semester}`;

        const renderProfileWithData = (profile, myItems, myRedditPosts, myTeams) => {
            // Render bio
            const bioText = document.getElementById('profile-bio');
            if (profile.bio && profile.bio.trim() !== '') {
                bioText.textContent = profile.bio;
                bioText.classList.remove('empty');
            } else {
                bioText.textContent = "No bio description added yet. Tell people about yourself, your interests, and what items you are looking for.";
                bioText.classList.add('empty');
            }

            // Render skills list
            const skillsContainer = document.getElementById('profile-skills-list');
            skillsContainer.innerHTML = '';
            const profileSkills = this.parseArrayField(profile.skills);
            if (profileSkills.length > 0) {
                profileSkills.forEach(skill => {
                    const sBadge = document.createElement('span');
                    sBadge.className = 'tag-badge skill';
                    sBadge.textContent = skill;
                    skillsContainer.appendChild(sBadge);
                });
            } else {
                skillsContainer.innerHTML = `<span class="text-muted italic" id="profile-skills-placeholder">No skills listed yet.</span>`;
            }

            // Render social links
            const gh = document.getElementById('profile-link-github');
            const li = document.getElementById('profile-link-linkedin');
            
            if (profile.github) {
                gh.style.display = 'inline-flex';
                gh.href = `https://github.com/${profile.github}`;
            } else {
                gh.style.display = 'none';
            }

            if (profile.linkedin) {
                li.style.display = 'inline-flex';
                li.href = `https://linkedin.com/in/${profile.linkedin}`;
            } else {
                li.style.display = 'none';
            }

            // Calculate Karma Score
            let receivedUpvotesCount = 0;
            myRedditPosts.forEach(p => {
                if (p.upvotes) receivedUpvotesCount += p.upvotes.length;
            });

            const karmaScore = (myRedditPosts.length * 5) + (receivedUpvotesCount * 2) + (myItems.length * 10);
            document.getElementById('profile-karma-value').textContent = karmaScore;

            // Renders Activity Lists
            this.renderProfileActivityTabs(myItems, myRedditPosts);

            // Renders Teams Tab
            const teamsGrid = document.getElementById('profile-teams-grid');
            teamsGrid.innerHTML = '';
            if (myTeams.length === 0) {
                teamsGrid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding: 2rem; color:var(--text-muted);">
                        <i data-lucide="users" style="width:32px; height:32px; margin-bottom:10px;"></i>
                        <p>No project teams created yet.</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            } else {
                myTeams.forEach(team => {
                    const card = document.createElement('div');
                    card.className = 'feature-card glass-panel team-card';
                    const appCount = (team.applicants || []).length;
                    card.innerHTML = `
                        <div style="text-align: left; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
                            <h4 style="margin-bottom: 0.5rem;">${team.teamName}</h4>
                            <p style="font-size:0.8rem; color:var(--text-muted); display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${team.description}</p>
                            <div style="margin-top:1.5rem;">
                                <button class="btn btn-primary" onclick="app.openManageApplicants('${team.id}')" style="width:100%; font-size:0.8rem; padding: 0.4rem;">Manage Applicants (${appCount})</button>
                            </div>
                        </div>
                    `;
                    teamsGrid.appendChild(card);
                });
                if (window.lucide) lucide.createIcons();
            }
        };

        if (this.isSupabaseEnabled()) {
            const listingsPromise = supabaseClient.from("listings").select("*").eq("seller_email", this.currentUser.email);
            const postsPromise = supabaseClient.from("reddit_posts").select("*").eq("author_email", this.currentUser.email);
            const teamsPromise = supabaseClient.from("teams").select("*").eq("created_by_email", this.currentUser.email);
            const profilePromise = supabaseClient.from("profiles").select("*").eq("email", this.currentUser.email).maybeSingle();

            Promise.all([listingsPromise, postsPromise, teamsPromise, profilePromise]).then(([listingsRes, postsRes, teamsRes, profileRes]) => {
                if (listingsRes.error) throw listingsRes.error;
                if (postsRes.error) throw postsRes.error;
                if (teamsRes.error) throw teamsRes.error;
                if (profileRes.error) throw profileRes.error;

                const myItems = (listingsRes.data || []).map(item => ({
                    ...item,
                    sellerName: item.seller_name,
                    sellerEmail: item.seller_email
                }));

                const myRedditPosts = (postsRes.data || []).map(p => ({
                    ...p,
                    authorName: p.author_name,
                    authorEmail: p.author_email,
                    commentsCount: p.comments_count
                }));

                const myTeams = (teamsRes.data || []).map(t => ({
                    ...t,
                    teamName: t.team_name,
                    openRoles: t.open_roles,
                    createdBy: t.created_by,
                    createdByEmail: t.created_by_email
                }));

                const profile = profileRes.data ? profileRes.data : { bio: "", skills: [], github: "", linkedin: "" };

                renderProfileWithData(profile, myItems, myRedditPosts, myTeams);
            }).catch(err => {
                console.error("Failed to load user profile from Supabase:", err);
            });
        } else {
            // Local mode
            const profileKey = `cl_profile_${this.currentUser.email}`;
            const profile = JSON.parse(localStorage.getItem(profileKey)) || { bio: "", skills: [], github: "", linkedin: "" };

            const redditPosts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
            const myRedditPosts = redditPosts.filter(p => p.authorEmail === this.currentUser.email);

            const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
            const myItems = listings.filter(item => item.sellerEmail === this.currentUser.email);

            const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
            const myTeams = teams.filter(t => t.createdByEmail === this.currentUser.email);

            renderProfileWithData(profile, myItems, myRedditPosts, myTeams);
        }
    },

    renderProfileActivityTabs(myItems, myRedditPosts) {
        // Tab 1: Listings
        const listingsGrid = document.getElementById('profile-listings-grid');
        this.renderListingsToContainer(myItems, listingsGrid, true);

        // Tab 2: Teams
        const teamsGrid = document.getElementById('profile-teams-grid');
        teamsGrid.innerHTML = '';
        const teams = this.isSupabaseEnabled() ? this.currentTeamsCache : (JSON.parse(localStorage.getItem('cl_teams')) || []);
        const myTeams = teams.filter(t => t.createdByEmail === this.currentUser.email);

        if (myTeams.length === 0) {
            teamsGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding: 2rem; color:var(--text-muted);">
                    <i data-lucide="users" style="width:32px; height:32px; margin-bottom:10px;"></i>
                    <p>No project teams created yet.</p>
                </div>
            `;
        } else {
            myTeams.forEach(team => {
                const card = document.createElement('div');
                card.className = 'feature-card glass-panel team-card';
                const appCount = (team.applicants || []).length;
                card.innerHTML = `
                    <div style="text-align: left; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
                        <h4 style="margin-bottom: 0.5rem;">${team.teamName}</h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${team.description}</p>
                        <div style="margin-top:1.5rem;">
                            <button class="btn btn-primary" onclick="app.openManageApplicants('${team.id}')" style="width:100%; font-size:0.8rem; padding: 0.4rem;">Manage Applicants (${appCount})</button>
                        </div>
                    </div>
                `;
                teamsGrid.appendChild(card);
            });
        }

        // Tab 3: Reddit Posts
        const postsGrid = document.getElementById('profile-posts-grid');
        postsGrid.innerHTML = '';
        if (myRedditPosts.length === 0) {
            postsGrid.innerHTML = `
                <div style="text-align:center; padding: 2rem; color:var(--text-muted);">
                    <i data-lucide="message-square" style="width:32px; height:32px; margin-bottom:10px;"></i>
                    <p>No community threads published yet.</p>
                </div>
            `;
        } else {
            myRedditPosts.forEach(post => {
                const card = document.createElement('div');
                card.className = 'product-card glass-panel';
                card.style.padding = '1.25rem';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 0.5rem;">
                        <span class="flair ${post.flair.toLowerCase()}" style="font-size:0.65rem;">${post.flair}</span>
                        <span style="font-size:0.75rem; color:var(--accent-yellow); font-weight:700;">r/${post.subreddit}</span>
                        <button class="reddit-action-btn delete-btn" onclick="app.deleteRedditPost('${post.id}')" style="font-size:0.75rem;"><i data-lucide="trash-2" style="width:12px; height:12px;"></i> Delete</button>
                    </div>
                    <h4 style="margin-bottom:0.25rem; text-align:left;">${post.title}</h4>
                    <p style="font-size:0.85rem; color:var(--text-muted);">${post.timestamp}</p>
                `;
                postsGrid.appendChild(card);
            });
        }

        if (window.lucide) lucide.createIcons();
    },

    switchProfileTab(tab) {
        document.querySelectorAll('.profile-tab-title').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.profile-pane').forEach(el => el.classList.remove('active'));

        document.getElementById(`profile-tab-${tab}`).classList.add('active');
        document.getElementById(`profile-pane-${tab}`).classList.add('active');
        this.activeProfileTab = tab;
    },

    // 10. CHAT / SIDEBAR UTILITIES
    renderChatSidebar() {
        const listContainer = document.getElementById('chat-thread-list');
        if (!listContainer) return;

        if (this.isSupabaseEnabled()) {
            const qA = supabaseClient.from("chats").select("*").eq("user_a", this.currentUser.email);
            const qB = supabaseClient.from("chats").select("*").eq("user_b", this.currentUser.email);

            Promise.all([qA, qB]).then(({0: snapA, 1: snapB}) => {
                if (snapA.error) throw snapA.error;
                if (snapB.error) throw snapB.error;

                const chatDocs = [];
                const seenRoomIds = new Set();

                const processSnap = (res) => {
                    (res.data || []).forEach(doc => {
                        if (!seenRoomIds.has(doc.room_id)) {
                            seenRoomIds.add(doc.room_id);
                            chatDocs.push(doc);
                        }
                    });
                };
                processSnap(snapA);
                processSnap(snapB);

                const inbox = {};
                
                // Always ensure campuslink_ai is in the inbox (even if no local msgs)
                const localInboxKey = `cl_messages_${this.currentUser.email}`;
                const localInbox = JSON.parse(localStorage.getItem(localInboxKey)) || {};
                if (localInbox["campuslink_ai"]) {
                    inbox["campuslink_ai"] = localInbox["campuslink_ai"];
                } else {
                    inbox["campuslink_ai"] = [];
                }

                // Load all local storage mock conversations so mock threads are visible
                Object.keys(localInbox).forEach(peer => {
                    inbox[peer] = localInbox[peer] || [];
                });

                chatDocs.forEach(chat => {
                    const peer = chat.user_a === this.currentUser.email ? chat.user_b : chat.user_a;
                    inbox[peer] = chat.messages || [];
                });

                this.renderSidebarWithInbox(inbox);
            }).catch(err => {
                console.error("Failed to load chat threads in sidebar, falling back to local:", err);
                const inboxKey = `cl_messages_${this.currentUser.email}`;
                const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
                this.renderSidebarWithInbox(inbox);
            });
        } else {
            const inboxKey = `cl_messages_${this.currentUser.email}`;
            const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
            this.renderSidebarWithInbox(inbox);
        }
    },

    renderSidebarWithInbox(inbox) {
        const listContainer = document.getElementById('chat-thread-list');
        if (!listContainer) return;

        const threads = Object.keys(inbox);

        listContainer.innerHTML = '';
        if (threads.length === 0) {
            listContainer.innerHTML = `
                <p class="text-muted text-center italic" style="padding:2rem;">No active chats. Start one through items on the marketplace!</p>
            `;
            return;
        }

        // Fetch users profiles to get real names
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];

        threads.forEach(email => {
            let userObj;
            let isAi = email === "campuslink_ai";
            if (isAi) {
                userObj = { name: "CampusLink AI", branch: "System AI Agent" };
            } else {
                userObj = users.find(u => u.email === email) || { name: email, branch: "VVCE" };
            }
            
            const messages = inbox[email] || [];
            const lastMsg = messages[messages.length - 1] || { text: "", timestamp: "" };

            // Count unread
            const unreadCount = messages.filter(m => m.sender === email && m.unread).length;

            const isSelected = this.activeChatEmail === email;
            const threadCard = document.createElement('div');
            threadCard.className = `chat-thread-item ${isSelected ? 'active' : ''}`;
            threadCard.onclick = () => this.selectChatThread(email);

            const avatarHtml = isAi ? 
                `<div class="user-avatar" style="background: linear-gradient(135deg, #f5c842, #8b5cf6); color: #fff; display:flex; align-items:center; justify-content:center;"><i data-lucide="sparkles" style="width: 14px; height: 14px;"></i></div>` : 
                `<div class="user-avatar">${userObj.name[0].toUpperCase()}</div>`;

            const nameHtml = isAi ? 
                `<span class="chat-thread-name">${userObj.name} <span class="badge-ai">AI</span></span>` : 
                `<span class="chat-thread-name">${userObj.name}</span>`;

            threadCard.innerHTML = `
                ${avatarHtml}
                <div class="chat-thread-details">
                    <div class="chat-thread-name-row">
                        ${nameHtml}
                        <span class="chat-thread-time">${lastMsg.timestamp}</span>
                    </div>
                    <div class="chat-thread-preview" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 160px;">${lastMsg.text}</div>
                </div>
                ${unreadCount > 0 ? `<div class="chat-unread-dot"></div>` : ''}
            `;
            listContainer.appendChild(threadCard);
        });
        if (window.lucide) lucide.createIcons();
    },

    renderChatPane() {
        const emptyState = document.getElementById('chat-empty-state');
        const chatContent = document.getElementById('chat-pane-content');
        
        if (!emptyState || !chatContent) return;

        if (!this.activeChatEmail) {
            emptyState.style.display = 'flex';
            chatContent.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        chatContent.style.display = 'flex';

        // Load contact details
        const isAi = this.activeChatEmail === "campuslink_ai";
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        const contact = isAi ? 
            { name: "CampusLink AI", branch: "Auto-Negotiator Bot" } :
            (users.find(u => u.email === this.activeChatEmail) || { name: this.activeChatEmail, branch: "VVCE" });

        document.getElementById('chat-header-name').innerHTML = isAi ? 
            `CampusLink AI <span class="badge-ai" style="margin-left:5px;">AI Agent</span>` : 
            contact.name;
            
        document.getElementById('chat-header-branch').textContent = isAi ? 
            "VVCE Auto-Negotiator & Assistant" : 
            `${contact.branch} | Semester ${contact.semester || '?'}`;

        const avatarNode = document.getElementById('chat-header-avatar');
        if (isAi) {
            avatarNode.innerHTML = `<i data-lucide="sparkles" style="width:14px; height:14px;"></i>`;
            avatarNode.style.background = `linear-gradient(135deg, #f5c842, #8b5cf6)`;
            avatarNode.style.color = `#fff`;
        } else {
            avatarNode.textContent = contact.name[0].toUpperCase();
            avatarNode.style.background = `var(--accent-yellow)`;
            avatarNode.style.color = `var(--text-dark)`;
        }

        if (this.isSupabaseEnabled() && !isAi) {
            // Handled by Realtime Subscription
            return;
        }

        // Local mark messages as read
        const inboxKey = `cl_messages_${this.currentUser.email}`;
        let inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
        if (inbox[this.activeChatEmail]) {
            inbox[this.activeChatEmail].forEach(m => {
                if (m.sender === this.activeChatEmail) m.unread = false;
            });
            localStorage.setItem(inboxKey, JSON.stringify(inbox));
        }

        const messages = inbox[this.activeChatEmail] || [];
        this.renderChatPaneWithMessages(messages);
    },

    renderChatPaneWithMessages(messages) {
        console.group("Checkpoint 5: renderChatPaneWithMessages Triggered");
        const viewport = document.getElementById('chat-messages-viewport');
        console.log("Target Viewport Container found:", viewport);
        console.log("Messages Array size for rendering:", messages?.length);
        console.groupEnd();

        if (!viewport) {
            console.error("Checkpoint 5 ERROR: 'chat-messages-viewport' DOM element not found!");
            return;
        }
        viewport.innerHTML = '';

        messages.forEach(msg => {
            const bubble = document.createElement('div');
            const isMe = msg.sender === this.currentUser.email;
            bubble.className = `chat-bubble ${isMe ? 'sent' : 'received'}`;
            
            let actionButtonsHtml = '';
            if (msg.text.includes("🚨 Price Proposal:") && !isMe) {
                const offer = (this.currentOffersCache || []).find(o => 
                    String(o.buyer_id) === String(msg.sender) && 
                    o.status === 'pending'
                );
                if (offer) {
                    actionButtonsHtml = `
                        <div class="offer-buttons-pills" style="margin-top: 0.5rem; justify-content: flex-end;">
                            <button class="btn-offer-action accept" onclick="app.acceptNegotiationOffer('${offer.id}', '${offer.item_id}')" style="padding: 4px 10px; font-size: 0.75rem;">Accept</button>
                            <button class="btn-offer-action decline" onclick="app.declineNegotiationOffer('${offer.id}')" style="padding: 4px 10px; font-size: 0.75rem;">Decline</button>
                        </div>
                    `;
                }
            }

            bubble.innerHTML = `
                <div>${msg.text}</div>
                ${actionButtonsHtml}
                <div class="chat-bubble-time">${msg.timestamp}</div>
            `;
            viewport.appendChild(bubble);
        });

        // Scroll to bottom
        viewport.scrollTop = viewport.scrollHeight;

        // Sync Badge Notifications & icons
        this.updateUnreadCountBadge();
        if (window.lucide) lucide.createIcons();
    },

    getChatRoomId(emailA, emailB) {
        return "chat_" + [emailA.toLowerCase(), emailB.toLowerCase()].sort().join('_').replace(/[@.]/g, '_');
    },

    selectChatThread(email) {
        this.activeChatEmail = email;
        this.renderChatSidebar(); // Update sidebar active state and list immediately!
        this.renderChatPane(); // Show chat pane container immediately!
        
        console.group("Checkpoint 1: selectChatThread Triggered");
        console.log("Current Logged-in User:", this.currentUser?.email);
        console.log("Chat Recipient selected:", email);
        console.log("[Sequence 1] selectChatThread initialized");
        console.groupEnd();

        // Unsubscribe from previous channel if any
        if (this.activeChatChannel) {
            supabaseClient.removeChannel(this.activeChatChannel);
            this.activeChatChannel = null;
        }

        this.toggleChatSidebar(false); // Hide sidebar in mobile

        const isAi = email === "campuslink_ai";

        if (this.isSupabaseEnabled() && !isAi) {
            const roomId = this.getChatRoomId(this.currentUser.email, email);
            console.log("[Sequence 2] Starting Supabase async fetch for Room:", roomId);
            
            // Fetch messages once initially
            supabaseClient.from("chats").select("*").eq("room_id", roomId).maybeSingle().then(({ data: chatDoc, error }) => {
                console.group("Checkpoint 2: Supabase Query Response Resolved");
                console.log("[Sequence 3] Database fetch promise resolved");
                console.log("Error Object:", error);
                console.log("Returned data row:", chatDoc);
                console.groupEnd();

                if (error) throw error;
                let messages = [];

                if (chatDoc) {
                    messages = chatDoc.messages || [];
                    
                    // Merge local offline test messages
                    const inboxKey = `cl_messages_${this.currentUser.email}`;
                    const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
                    const localMsgs = inbox[email] || [];
                    localMsgs.forEach(lm => {
                        if (!messages.some(cm => cm.text === lm.text && cm.sender === lm.sender)) {
                            messages.push(lm);
                        }
                    });
                    
                    // Mark peer's messages as read
                    let updated = false;
                    const updatedMessages = messages.map(m => {
                        if (m.sender === email && m.unread) {
                            m.unread = false;
                            updated = true;
                        }
                        return m;
                    });

                    if (updated) {
                        supabaseClient.from("chats").update({
                            messages: updatedMessages
                        }).eq("room_id", roomId).then(({ error }) => {
                            if (error) console.error("Failed to update unread status:", error);
                        });
                    }
                } else {
                    console.log("Checkpoint 2b: Room document doesn't exist in Supabase yet. Initializing with local mock messages...");
                    // Create the chat document and seed it with local mock messages if they exist!
                    const inboxKey = `cl_messages_${this.currentUser.email}`;
                    const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
                    const localMsgs = inbox[email] || [];
                    
                    messages = localMsgs;
                    
                    supabaseClient.from("chats").insert({
                        room_id: roomId,
                        user_a: this.currentUser.email,
                        user_b: email,
                        messages: localMsgs
                    }).catch(err => console.error("Failed to create room doc:", err));
                }

                console.log("[Sequence 4] Rendering chat pane bubbles with messages count:", messages.length);
                this.renderChatPaneWithMessages(messages);
            }).catch((err) => {
                console.group("Checkpoint 3: Supabase Load Error Fallback");
                console.error("Failed to load chat thread from Supabase:", err);
                console.log("Initiating automatic client-side local storage fallback...");
                console.groupEnd();

                const inboxKey = `cl_messages_${this.currentUser.email}`;
                const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
                const messages = inbox[email] || [];
                
                console.log("[Sequence 4 Fallback] Rendering local messages count:", messages.length);
                this.renderChatPaneWithMessages(messages);
            });

            // Set up real-time channel subscription
            this.activeChatChannel = supabaseClient
                .channel(`room_${roomId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'chats', filter: `room_id=eq.${roomId}` },
                    (payload) => {
                        const messages = payload.new.messages || [];
                        this.renderChatPaneWithMessages(messages);
                    }
                )
                .subscribe();
        } else {
            this.renderChatPane();
        }
    },

    toggleChatSidebar(show) {
        const container = document.querySelector('.chat-container');
        const backBtn = document.getElementById('chat-back-btn');

        if (!container) return;

        if (window.innerWidth <= 767) {
            // Use data-chat-view CSS-driven switching
            if (show) {
                container.setAttribute('data-chat-view', 'list');
                if (backBtn) backBtn.style.display = 'none';
            } else {
                container.setAttribute('data-chat-view', 'chat');
                if (backBtn) backBtn.style.display = 'flex';
            }
        } else {
            // Desktop: always show both panes
            container.setAttribute('data-chat-view', 'list');
            const pane = document.getElementById('chat-pane');
            if (pane) pane.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'none';
        }
    },

    updateUnreadCountBadge() {
        if (this.isSupabaseEnabled()) {
            // Count unread from our snapshot inbox representation
            const qA = supabaseClient.from("chats").select("*").eq("user_a", this.currentUser.email);
            const qB = supabaseClient.from("chats").select("*").eq("user_b", this.currentUser.email);

            Promise.all([qA, qB]).then(({0: snapA, 1: snapB}) => {
                let totalUnread = 0;
                const seenRoomIds = new Set();

                const processSnap = (res) => {
                    (res.data || []).forEach(doc => {
                        if (!seenRoomIds.has(doc.room_id)) {
                            seenRoomIds.add(doc.room_id);
                            const msgs = doc.messages || [];
                            totalUnread += msgs.filter(m => m.sender !== this.currentUser.email && m.unread).length;
                        }
                    });
                };
                processSnap(snapA);
                processSnap(snapB);

                const badge = document.getElementById('nav-chat-badge');
                if (badge) {
                    if (totalUnread > 0) {
                        badge.style.display = 'inline-flex';
                        badge.textContent = totalUnread;
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }).catch(err => console.error("Failed to update unread badge:", err));
        } else {
            const inboxKey = `cl_messages_${this.currentUser.email}`;
            const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
            let totalUnread = 0;

            Object.keys(inbox).forEach(email => {
                const thread = inbox[email] || [];
                totalUnread += thread.filter(m => m.sender === email && m.unread).length;
            });

            const badge = document.getElementById('nav-chat-badge');
            if (badge) {
                if (totalUnread > 0) {
                    badge.style.display = 'inline-flex';
                    badge.textContent = totalUnread;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    },

    // 11. SETUP EVENTS & LISTENERS
    setupEventListeners() {
        // Close dropdowns on window clicks
        window.addEventListener('click', () => {
            this.closeAllDropdowns();
        });

        // Admin Event Form submit listener
        const adminEventForm = document.getElementById('admin-event-form');
        if (adminEventForm) {
            adminEventForm.addEventListener('submit', (e) => {
                this.handleAdminEventSubmit(e);
            });
        }

        // Admin Announcement Form submit listener
        const adminAnnForm = document.getElementById('admin-announcement-form');
        if (adminAnnForm) {
            adminAnnForm.addEventListener('submit', (e) => {
                this.handleAdminAnnouncementSubmit(e);
            });
        }

        // Sign In submit
        const signinForm = document.getElementById('signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const emailInput = document.getElementById('signin-email');
                const passwordInput = document.getElementById('signin-password');
                const btn = document.getElementById('signin-submit-btn');

                const email = emailInput.value.trim().toLowerCase();
                const password = passwordInput.value.trim();

                // VVCE domain validation
                if (!email.endsWith('@vvce.ac.in')) {
                    this.showToast('Only @vvce.ac.in email addresses are allowed.', 'error');
                    return;
                }

                // Loading visual
                btn.classList.add('loading');
                btn.disabled = true;

                if (this.isSupabaseEnabled()) {
                    supabaseClient.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
                        if (error) throw error;
                        this.showToast("Signed in successfully!", "success");
                        signinForm.reset();
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    }).catch((err) => {
                        this.showToast(err.message || "Invalid credentials", "error");
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    });
                } else {
                    setTimeout(() => {
                        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
                        const user = users.find(u => u.email === email && u.password === password);

                        if (user) {
                            localStorage.setItem('cl_current_user', JSON.stringify(user));
                            this.showToast(`Welcome back, ${user.name}!`, "success");
                            
                            this.checkAuthSession();
                            signinForm.reset();
                        } else {
                            this.showToast("Invalid email credentials or password", "error");
                        }
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    }, 1200);
                }
            });
        }

        // Sign Up submit
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const name = document.getElementById('signup-name').value.trim();
                const email = document.getElementById('signup-email').value.trim().toLowerCase();
                const branch = document.getElementById('signup-branch').value;
                const semester = document.getElementById('signup-semester').value;
                const phone = document.getElementById('signup-phone').value.trim();
                const password = document.getElementById('signup-password').value.trim();
                const btn = document.getElementById('signup-submit-btn');

                // VVCE domain validation
                if (!email.endsWith('@vvce.ac.in')) {
                    this.showToast('Only @vvce.ac.in email addresses are allowed.', 'error');
                    return;
                }

                btn.classList.add('loading');
                btn.disabled = true;

                if (this.isSupabaseEnabled()) {
                    supabaseClient.auth.signUp({ email, password }).then(({ data, error }) => {
                        if (error) throw error;
                        const newUser = { name, email, branch, semester, phone };
                        return supabaseClient.from("users").insert(newUser).then(({ error: insertErr }) => {
                            if (insertErr) throw insertErr;
                            return supabaseClient.from("profiles").insert({
                                email,
                                bio: "",
                                skills: [],
                                github: "",
                                linkedin: ""
                            });
                        }).then(({ error: profErr }) => {
                            if (profErr) throw profErr;
                            this.showToast("Account created successfully!", "success");
                            signupForm.reset();
                            btn.classList.remove('loading');
                            btn.disabled = false;
                        });
                    }).catch((err) => {
                        this.showToast(err.message || "Registration failed", "error");
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    });
                } else {
                    setTimeout(() => {
                        let users = JSON.parse(localStorage.getItem('cl_users')) || [];
                        const exists = users.some(u => u.email === email);

                        if (exists) {
                            this.showToast("An account already exists with this email", "error");
                            btn.classList.remove('loading');
                            btn.disabled = false;
                            return;
                        }

                        const newUser = { name, email, branch, semester, phone, password };
                        users.push(newUser);
                        localStorage.setItem('cl_users', JSON.stringify(users));

                        // Init default empty profile
                        const profileKey = `cl_profile_${email}`;
                        localStorage.setItem(profileKey, JSON.stringify({
                            bio: "",
                            skills: [],
                            github: "",
                            linkedin: ""
                        }));

                        localStorage.setItem('cl_current_user', JSON.stringify(newUser));
                        this.showToast(`Registration successful! Welcome to CampusLink.`, "success");
                        
                        this.checkAuthSession();
                        signupForm.reset();
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    }, 1200);
                }
            });
        }

        // Forgot password submit
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = document.getElementById('reset-submit-btn');
                const email = document.getElementById('reset-email').value.trim().toLowerCase();

                btn.classList.add('loading');
                btn.disabled = true;

                if (this.isSupabaseEnabled()) {
                    supabaseClient.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin
                    }).then(({ error }) => {
                        if (error) throw error;
                        this.showToast("Reset password instructions sent to your VVCE email!", "success");
                        btn.classList.remove('loading');
                        btn.disabled = false;
                        this.closeModal('forgot-password-modal');
                        forgotForm.reset();
                    }).catch((err) => {
                        this.showToast(err.message || "Failed to send reset email", "error");
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    });
                } else {
                    setTimeout(() => {
                        this.showToast("Reset password instructions sent to your VVCE email!", "success");
                        btn.classList.remove('loading');
                        btn.disabled = false;
                        this.closeModal('forgot-password-modal');
                        forgotForm.reset();
                    }, 1200);
                }
            });
        }

        // Post listing form
        const postForm = document.getElementById('post-item-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const title = document.getElementById('item-title').value.trim();
                const price = parseFloat(document.getElementById('item-price').value);
                const category = document.getElementById('item-category').value;
                const condition = document.querySelector('input[name="item-condition"]:checked').value;
                const description = document.getElementById('item-desc').value.trim();

                const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];

                const fileInput = document.getElementById('file-input');
                let uploadPromise = Promise.resolve(null);

                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    uploadPromise = new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            resolve(event.target.result);
                        };
                        reader.onerror = () => {
                            resolve(null);
                        };
                        reader.readAsDataURL(file);
                    });
                }

                uploadPromise.then((base64Image) => {
                    let dummyImages = [
                        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
                        "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600",
                        "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600"
                    ];
                    let chosenImage = base64Image ? base64Image : dummyImages[Math.floor(Math.random() * dummyImages.length)];

                    const newListing = {
                        id: Date.now(),
                        title,
                        price,
                        category,
                        condition,
                        description,
                        seller_name: this.currentUser.name,
                        seller_email: this.currentUser.email,
                        image: chosenImage,
                        timestamp: "Just now"
                    };

                    if (this.isSupabaseEnabled()) {
                        supabaseClient.from("listings").insert(newListing).then(({ error }) => {
                            if (error) throw error;
                            this.showToast("Your item has been posted on the marketplace!", "success");
                            postForm.reset();
                            
                            const dz = document.getElementById('drop-zone');
                            if (dz) {
                                const p = dz.querySelector('p');
                                p.textContent = "Drag & drop or click to upload";
                                p.style.color = 'var(--text-main)';
                            }
                            this.navigate('browse');
                        }).catch((err) => {
                            console.error("Failed to post item to Supabase:", err);
                            this.showToast("Failed to post cloud listing", "error");
                        });
                    } else {
                        const localListing = {
                            id: newListing.id,
                            title,
                            price,
                            category,
                            condition,
                            description,
                            sellerName: this.currentUser.name,
                            sellerEmail: this.currentUser.email,
                            image: chosenImage,
                            timestamp: "Just now"
                        };
                        listings.unshift(localListing);
                        localStorage.setItem('cl_listings', JSON.stringify(listings));

                        this.showToast("Your item has been posted on the marketplace!", "success");
                        postForm.reset();
                        
                        const dz = document.getElementById('drop-zone');
                        if (dz) {
                            const p = dz.querySelector('p');
                            p.textContent = "Drag & drop or click to upload";
                            p.style.color = 'var(--text-main)';
                        }

                        this.navigate('browse');
                    }
                });
            });
        }

        // Edit listing form submit
        const editListingForm = document.getElementById('edit-listing-form');
        if (editListingForm) {
            editListingForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const id = parseInt(document.getElementById('edit-item-id').value);
                const title = document.getElementById('edit-item-title').value.trim();
                const price = parseFloat(document.getElementById('edit-item-price').value);
                const category = document.getElementById('edit-item-category').value;
                const condition = document.querySelector('input[name="edit-item-condition"]:checked').value;
                const description = document.getElementById('edit-item-desc').value.trim();

                if (this.isSupabaseEnabled()) {
                    supabaseClient.from("listings").update({
                        title,
                        price,
                        category,
                        condition,
                        description
                    }).eq("id", id).then(({ error }) => {
                        if (error) throw error;
                        this.showToast("Item listing updated successfully!", "success");
                        this.closeModal('edit-listing-modal');
                        if (this.currentView === 'browse') {
                            this.renderProducts();
                        } else if (this.currentView === 'profile') {
                            this.renderProfile();
                        }
                    }).catch((err) => {
                        console.error("Failed to update Supabase listing:", err);
                        this.showToast("Failed to update cloud listing", "error");
                    });
                } else {
                    let listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
                    const idx = listings.findIndex(item => String(item.id) === String(id));

                    if (idx > -1) {
                        listings[idx].title = title;
                        listings[idx].price = price;
                        listings[idx].category = category;
                        listings[idx].condition = condition;
                        listings[idx].description = description;

                        localStorage.setItem('cl_listings', JSON.stringify(listings));
                        this.showToast("Item listing updated successfully!", "success");
                        this.closeModal('edit-listing-modal');
                        
                        if (this.currentView === 'browse') {
                            this.filterListings();
                        } else if (this.currentView === 'profile') {
                            this.renderProfile();
                        }
                    }
                }
            });
        }

        // Create Team form submit
        const createTeamForm = document.getElementById('create-team-form');
        if (createTeamForm) {
            createTeamForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const teamName = document.getElementById('team-name').value.trim();
                const description = document.getElementById('team-desc').value.trim();
                const skills = document.getElementById('team-skills').value.trim();
                const openRoles = document.getElementById('team-roles').value.trim();

                const newTeam = {
                    id: Date.now(),
                    team_name: teamName,
                    description,
                    skills,
                    open_roles: openRoles,
                    created_by: this.currentUser.name,
                    created_by_email: this.currentUser.email,
                    applicants: []
                };

                if (this.isSupabaseEnabled()) {
                    supabaseClient.from("teams").insert(newTeam).then(({ error }) => {
                        if (error) throw error;
                        this.showToast("New project squad posted successfully!", "success");
                        createTeamForm.reset();
                        this.closeModal('create-team-modal');
                        this.renderTeams();
                    }).catch((err) => {
                        console.error("Failed to save team in Supabase:", err);
                        this.showToast("Failed to create cloud team", "error");
                    });
                } else {
                    const localTeam = {
                        id: newTeam.id,
                        teamName,
                        description,
                        skills,
                        openRoles,
                        createdBy: this.currentUser.name,
                        createdByEmail: this.currentUser.email,
                        applicants: []
                    };
                    const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
                    teams.push(localTeam);
                    localStorage.setItem('cl_teams', JSON.stringify(teams));

                    this.showToast("Your project team recruitment is active!", "success");
                    this.closeModal('create-team-modal');
                    createTeamForm.reset();
                    
                    if (this.currentView === 'collab') {
                        this.renderTeams();
                    } else if (this.currentView === 'profile') {
                        this.renderProfile();
                    }
                }
            });
        }

        // Register Hackathon Team form submit
        const regHackForm = document.getElementById('register-hackathon-form');
        if (regHackForm) {
            regHackForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const hackId = parseInt(document.getElementById('reg-hackathon-id').value);
                const teamName = document.getElementById('reg-team-name').value.trim();
                const members = document.getElementById('reg-members').value.trim();
                const phone = document.getElementById('reg-phone').value.trim();

                if (this.isSupabaseEnabled()) {
                    supabaseClient.from("hackathon_registrations").insert({
                        hackathon_id: hackId,
                        team_name: teamName,
                        members,
                        phone,
                        user_email: this.currentUser.email
                    }).then(({ error }) => {
                        if (error) throw error;
                        this.showToast(`Team ${teamName} registered successfully!`, "success");
                        this.closeModal('register-hackathon-modal');
                        regHackForm.reset();
                        this.renderHackathons();
                    }).catch((err) => {
                        console.error("Failed to save hackathon registration in Supabase:", err);
                        this.showToast("Failed to register hackathon team", "error");
                    });
                } else {
                    let registrations = JSON.parse(localStorage.getItem('cl_hackathon_registrations')) || [];
                    
                    // Add registration record
                    registrations.push({
                        hackathonId: hackId,
                        teamName,
                        members,
                        phone,
                        userEmail: this.currentUser.email
                    });
                    localStorage.setItem('cl_hackathon_registrations', JSON.stringify(registrations));

                    // Success toast & close
                    this.showToast(`Team ${teamName} registered successfully!`, "success");
                    this.closeModal('register-hackathon-modal');
                    regHackForm.reset();

                    // Re-render
                    this.renderHackathons();
                }
            });
        }

        // Create Reddit Post form submit
        const createRedditPostForm = document.getElementById('new-reddit-post-form');
        if (createRedditPostForm) {
            createRedditPostForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const subreddit = document.getElementById('reddit-post-sub').value;
                const title = document.getElementById('reddit-post-title').value.trim();
                const flair = document.getElementById('reddit-post-flair').value;
                const body = document.getElementById('reddit-post-body').value.trim();

                const newPost = {
                    id: Date.now(),
                    subreddit,
                    title,
                    flair,
                    body,
                    author_name: this.currentUser.name,
                    author_email: this.currentUser.email,
                    timestamp: "Just now",
                    upvotes: [this.currentUser.email], // self upvote
                    downvotes: [],
                    comments_count: 0
                };

                if (this.isSupabaseEnabled()) {
                    supabaseClient.from("reddit_posts").insert(newPost).then(({ error }) => {
                        if (error) throw error;
                        this.showToast(`Post published to r/${subreddit}!`, "success");
                        this.closeModal('new-reddit-post-modal');
                        createRedditPostForm.reset();

                        if (this.currentView === 'reddit') {
                            this.activeSubreddit = subreddit; // Auto navigate to posted subreddit
                            this.renderRedditPosts();
                        } else if (this.currentView === 'profile') {
                            this.renderProfile();
                        }
                    }).catch((err) => {
                        console.error("Failed to create post in Supabase:", err);
                        this.showToast("Failed to publish cloud post", "error");
                    });
                } else {
                    const localPost = {
                        id: newPost.id,
                        subreddit,
                        title,
                        flair,
                        body,
                        authorName: this.currentUser.name,
                        authorEmail: this.currentUser.email,
                        timestamp: "Just now",
                        upvotes: [this.currentUser.email],
                        downvotes: [],
                        commentsCount: 0
                    };
                    let posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
                    posts.unshift(localPost);
                    localStorage.setItem('cl_reddit_posts', JSON.stringify(posts));

                    this.showToast(`Post published to r/${subreddit}!`, "success");
                    this.closeModal('new-reddit-post-modal');
                    createRedditPostForm.reset();

                    // Re-render
                    if (this.currentView === 'reddit') {
                        this.activeSubreddit = subreddit; // Auto navigate to posted subreddit
                        this.renderRedditPosts();
                    } else if (this.currentView === 'profile') {
                        this.renderProfile();
                    }
                }
            });
        }

        // Send chat message
        const chatForm = document.getElementById('chat-send-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const input = document.getElementById('chat-message-input');
                const text = input.value.trim();
                if (text === '' || !this.activeChatEmail) return;

                const buyerInboxKey = `cl_messages_${this.currentUser.email}`;
                let buyerInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};

                const newMsg = {
                    sender: this.currentUser.email,
                    text: text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    unread: false
                };

                const isAi = this.activeChatEmail === "campuslink_ai";

                if (isAi) {
                    newMsg.timestamp = "Just now"; // Keep simple local timestamp for mock AI
                    if (!buyerInbox["campuslink_ai"]) buyerInbox["campuslink_ai"] = [];
                    buyerInbox["campuslink_ai"].push(newMsg);
                    localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
                    
                    input.value = '';
                    input.focus();
                    this.renderChatPane();
                    this.renderChatSidebar();

                    // Display typing indicator
                    const viewport = document.getElementById('chat-messages-viewport');
                    if (viewport) {
                        const typingNode = document.createElement('div');
                        typingNode.className = 'chat-bubble received typing-bubble';
                        typingNode.id = 'chat-ai-typing';
                        typingNode.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
                        viewport.appendChild(typingNode);
                        viewport.scrollTop = viewport.scrollHeight;
                    }

                    // Trigger AI response after short delay
                    setTimeout(() => {
                        const typingNode = document.getElementById('chat-ai-typing');
                        if (typingNode) typingNode.remove();

                        const aiReplyText = this.generateAiResponse(text);
                        let updatedInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};
                        if (!updatedInbox["campuslink_ai"]) updatedInbox["campuslink_ai"] = [];
                        
                        updatedInbox["campuslink_ai"].push({
                            sender: "campuslink_ai",
                            text: aiReplyText,
                            timestamp: "Just now",
                            unread: false
                        });

                        localStorage.setItem(buyerInboxKey, JSON.stringify(updatedInbox));
                        if (this.activeChatEmail === "campuslink_ai") {
                            this.renderChatPane();
                        }
                        this.renderChatSidebar();
                    }, 1200);

                } else if (this.isSupabaseEnabled()) {
                    const roomId = this.getChatRoomId(this.currentUser.email, this.activeChatEmail);
                    const cloudMsg = {
                        sender: this.currentUser.email,
                        text: text,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        unread: true
                    };

                    supabaseClient.from("chats").select("messages").eq("room_id", roomId).maybeSingle().then(({ data, error }) => {
                        if (error) throw error;
                        const messages = data ? (data.messages || []) : [];
                        messages.push(cloudMsg);
                        
                        // Optimistic rendering: Show message on screen immediately!
                        this.renderChatPaneWithMessages(messages);
                        
                        // Use upsert to handle new chat rooms seamlessly
                        return supabaseClient.from("chats").upsert({
                            room_id: roomId,
                            user_a: this.currentUser.email,
                            user_b: this.activeChatEmail,
                            messages: messages
                        });
                    }).then(({ error }) => {
                        if (error) throw error;
                        input.value = '';
                        input.focus();
                    }).catch((err) => {
                        console.error("Failed to send Supabase message, falling back to local storage:", err);
                        
                        // Local storage fallback
                        const localMsg = { ...cloudMsg, timestamp: "Just now", unread: false };
                        const recipientMsg = { ...localMsg, unread: true };
                        const sellerInboxKey = `cl_messages_${this.activeChatEmail}`;
                        let sellerInbox = JSON.parse(localStorage.getItem(sellerInboxKey)) || {};

                        if (!buyerInbox[this.activeChatEmail]) buyerInbox[this.activeChatEmail] = [];
                        if (!sellerInbox[this.currentUser.email]) sellerInbox[this.currentUser.email] = [];

                        buyerInbox[this.activeChatEmail].push(localMsg);
                        sellerInbox[this.currentUser.email].push(recipientMsg);

                        localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
                        localStorage.setItem(sellerInboxKey, JSON.stringify(sellerInbox));

                        input.value = '';
                        input.focus();
                        this.renderChatPane();
                        this.renderChatSidebar();
                    });
                } else {
                    // Standard message to real student
                    newMsg.timestamp = "Just now"; // Keep local simple timestamp
                    const sellerInboxKey = `cl_messages_${this.activeChatEmail}`;
                    let sellerInbox = JSON.parse(localStorage.getItem(sellerInboxKey)) || {};

                    if (!buyerInbox[this.activeChatEmail]) buyerInbox[this.activeChatEmail] = [];
                    if (!sellerInbox[this.currentUser.email]) sellerInbox[this.currentUser.email] = [];

                    buyerInbox[this.activeChatEmail].push(newMsg);
                    
                    const recipientMsg = { ...newMsg, unread: true };
                    sellerInbox[this.currentUser.email].push(recipientMsg);

                    localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
                    localStorage.setItem(sellerInboxKey, JSON.stringify(sellerInbox));

                    input.value = '';
                    input.focus();
                    this.renderChatPane();
                    this.renderChatSidebar();

                    // Trigger simulated seller auto-reply from the offline user!
                    this.triggerSellerAutoReply(this.activeChatEmail, text);
                }
            });
        }

        // Edit profile submit
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const bio = document.getElementById('edit-bio').value.trim();
                const skillsInput = document.getElementById('edit-skills').value.trim();
                const github = document.getElementById('edit-github').value.trim();
                const linkedin = document.getElementById('edit-linkedin').value.trim();

                const skills = skillsInput === "" ? [] : skillsInput.split(',').map(s => s.trim()).filter(s => s !== "");
                const updatedProfile = { bio, skills, github, linkedin };

                if (this.isSupabaseEnabled()) {
                    supabaseClient.from("profiles").upsert({
                        email: this.currentUser.email,
                        ...updatedProfile
                    }).then(({ error }) => {
                        if (error) throw error;
                        this.showToast("Your profile dashboard has been updated!", "success");
                        this.closeModal('edit-profile-modal');
                        this.renderProfile();
                    }).catch((err) => {
                        console.error("Failed to update Supabase profile:", err);
                        this.showToast("Failed to update cloud profile", "error");
                    });
                } else {
                    const profileKey = `cl_profile_${this.currentUser.email}`;
                    localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
                    this.showToast("Your profile dashboard has been updated!", "success");
                    this.closeModal('edit-profile-modal');
                    this.renderProfile();
                }
            });
        }

        // Drag and drop zone
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    const p = dropZone.querySelector('p');
                    p.textContent = `${e.dataTransfer.files.length} file(s) selected`;
                    p.style.color = 'var(--accent-yellow)';
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    const p = dropZone.querySelector('p');
                    p.textContent = `${fileInput.files.length} file(s) selected`;
                    p.style.color = 'var(--accent-yellow)';
                }
            });
        }

        // Edit Profile modal population hook
        const origOpenModal = this.openModal;
        this.openModal = (modalId) => {
            if (modalId === 'edit-profile-modal') {
                if (this.isSupabaseEnabled()) {
                    supabaseClient.from("profiles").select("*").eq("email", this.currentUser.email).maybeSingle().then(({ data: profile, error }) => {
                        if (error) throw error;
                        const prof = profile || { bio: "", skills: [], github: "", linkedin: "" };
                        document.getElementById('edit-bio').value = prof.bio || "";
                        document.getElementById('edit-skills').value = this.parseArrayField(prof.skills).join(', ');
                        document.getElementById('edit-github').value = prof.github || "";
                        document.getElementById('edit-linkedin').value = prof.linkedin || "";
                    }).catch(err => console.error("Failed to fetch profile for editing:", err));
                } else {
                    const profileKey = `cl_profile_${this.currentUser.email}`;
                    const profile = JSON.parse(localStorage.getItem(profileKey)) || { bio: "", skills: [], github: "", linkedin: "" };

                    document.getElementById('edit-bio').value = profile.bio || "";
                    document.getElementById('edit-skills').value = this.parseArrayField(profile.skills).join(', ');
                    document.getElementById('edit-github').value = profile.github || "";
                    document.getElementById('edit-linkedin').value = profile.linkedin || "";
                }
            }
            origOpenModal.call(this, modalId);
        };

        // Price Negotiation Form Submit
        const negotiateForm = document.getElementById('negotiate-offer-form');
        if (negotiateForm) {
            negotiateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitNegotiateOffer(e);
            });
        }
    },

    // ---- Mobile Nav Drawer ----
    openNavDrawer() {
        const drawer = document.getElementById('nav-drawer');
        const overlay = document.getElementById('nav-drawer-overlay');
        if (drawer) drawer.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        // Update drawer user info
        if (this.currentUser) {
            const name = document.getElementById('drawer-user-name');
            const email = document.getElementById('drawer-user-email');
            const avatar = document.getElementById('drawer-user-avatar');
            if (name) name.textContent = this.currentUser.name || 'Student';
            if (email) email.textContent = this.currentUser.email || '';
            if (avatar) avatar.textContent = (this.currentUser.name || 'S').charAt(0).toUpperCase();
        }
        lucide.createIcons();
    },

    closeNavDrawer() {
        const drawer = document.getElementById('nav-drawer');
        const overlay = document.getElementById('nav-drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    },

    toggleMobileMenu() {
        this.openNavDrawer();
    },

    // ---- Filter Bottom Sheet ----
    openFilterSheet() {
        const sheet = document.getElementById('filter-bottom-sheet');
        const overlay = document.getElementById('filter-sheet-overlay');
        if (sheet) sheet.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        lucide.createIcons();
    },

    closeFilterSheet() {
        const sheet = document.getElementById('filter-bottom-sheet');
        const overlay = document.getElementById('filter-sheet-overlay');
        if (sheet) sheet.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    },

    logout() {
        sessionStorage.setItem('cl_logged_out_once', 'true');
        // Immediately hide the authenticated UI
        this.currentUser = null;
        this.activeChatEmail = null;
        this.currentView = 'home';
        if (this.isSupabaseEnabled()) {
            if (this.activeChatChannel) {
                supabaseClient.removeChannel(this.activeChatChannel);
                this.activeChatChannel = null;
            }
            // Show anonymous UI immediately before the async signOut completes
            this.renderAnonymousUI();
            supabaseClient.auth.signOut().then(() => {
                this.showToast("Logged out successfully!", "info");
            }).catch((err) => {
                console.error("Sign out failed:", err);
            });
        } else {
            localStorage.removeItem('cl_current_user');
            this.showToast("Logged out successfully!", "info");
            this.renderAnonymousUI();
        }
    },

    /* ==========================================================================
       CampusLink Image-matching & AI Assistant Integrations
       ========================================================================== */

    chatWithAiAboutListing(productId) {
        let listings = [];
        if (this.isSupabaseEnabled()) {
            listings = this.currentListingsCache || [];
        }
        if (!listings || listings.length === 0) {
            listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        }

        let item = listings.find(i => String(i.id) === String(productId));
        if (!item) {
            item = {
                id: productId,
                title: "this item",
                price: 500,
                sellerName: "the seller",
                condition: "good",
                category: "General",
                description: "No details available."
            };
        } else {
            if (!item.sellerName && item.seller_name) {
                item.sellerName = item.seller_name;
            }
        }

        sessionStorage.setItem('cl_active_ai_item_id', productId);
        this.activeChatEmail = "campuslink_ai";

        const inboxKey = `cl_messages_${this.currentUser.email}`;
        let inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};

        if (!inbox["campuslink_ai"]) {
            inbox["campuslink_ai"] = [];
        }

        // Add a context greeting
        const text = `Hey there, ${this.currentUser.name}! I am your **CampusLink AI Assistant** 🤖. I see you're looking at **${item.sellerName}'s ${item.title}** (Price: ₹${item.price.toLocaleString('en-IN')}, Condition: ${item.condition}). \n\nI'm ready to act as a negotiator, explain the item details, or suggest meeting spots on the VVCE campus! Ask me anything, or try saying *"Is the price fair?"* or *"Offer ₹${Math.round(item.price * 0.85)}"*!`;
        
        // Push initial greeting from AI helper
        inbox["campuslink_ai"].push({
            sender: "campuslink_ai",
            text: text,
            timestamp: "Just now",
            unread: false
        });

        localStorage.setItem(inboxKey, JSON.stringify(inbox));

        // Navigate to chat
        this.navigate('chat');
        this.renderChatSidebar();
        this.renderChatPane();
    },

    generateAiResponse(userInput) {
        let listings = [];
        if (this.isSupabaseEnabled()) {
            listings = this.currentListingsCache || [];
        }
        if (!listings || listings.length === 0) {
            listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        }

        const activeItemId = sessionStorage.getItem('cl_active_ai_item_id');
        let rawItem = listings.find(i => i.id == activeItemId) || listings[0];
        
        const fallbackItem = {
            title: "this item",
            price: 500,
            sellerName: "the seller",
            condition: "good",
            category: "General",
            description: "No details available."
        };

        const item = rawItem ? {
            title: rawItem.title || "this item",
            price: rawItem.price || 500,
            sellerName: rawItem.sellerName || rawItem.seller_name || "the seller",
            condition: rawItem.condition || "good",
            category: rawItem.category || "General",
            description: rawItem.description || "No details available."
        } : fallbackItem;
        
        const input = userInput.toLowerCase();
        let reply = "";

        if (input.includes('hi') || input.includes('hello') || input.includes('hey')) {
            reply = `Hello! I'm here to discuss **${item.title}** listed by ${item.sellerName} for ₹${item.price.toLocaleString('en-IN')}. \n\nWould you like to ask if the price is fair, negotiate a discount, or find out where you can meet on the VVCE campus?`;
        } 
        else if (input.includes('fair') || input.includes('price fair') || input.includes('good deal')) {
            const brandNewPrice = item.price * 1.5;
            reply = `Looking at past transactions, this price of **₹${item.price.toLocaleString('en-IN')}** is a solid deal! A brand new version of this retails for around ₹${Math.round(brandNewPrice).toLocaleString('en-IN')}, and ${item.sellerName} listed it in **${item.condition}** condition. I highly recommend grabbing it before other batchmates see it!`;
        } 
        else if (input.includes('offer') || input.includes('price') || input.includes('discount') || input.includes('cheap') || input.includes('negotiate') || /\d+/.test(input)) {
            // Try to extract any number offered
            const numberMatch = input.match(/\d+/);
            const offeredPrice = numberMatch ? parseInt(numberMatch[0]) : null;

            if (offeredPrice) {
                const discount = (item.price - offeredPrice) / item.price;
                if (offeredPrice >= item.price) {
                    reply = `Wait, you offered **₹${offeredPrice}**, which is equal to or higher than the listing price of ₹${item.price}! ${item.sellerName} will absolutely love you for this! Deal agreed! Let's arrange a meetup.`;
                } else if (discount <= 0.15) {
                    reply = `I checked with the seller: **₹${offeredPrice}** is within a reasonable range! \n\n${item.sellerName} says: *"Deal! Since you're also in VVCE, I can drop it to ₹${offeredPrice}. Let's meet during the lunch break near the campus library!"* \n\nShould I lock in this meetup?`;
                } else if (discount <= 0.3) {
                    const counterPrice = Math.round(item.price * 0.9);
                    reply = `Oof! ₹${offeredPrice} is a bit of a stretch (that's a ${Math.round(discount * 100)}% discount!). \n\n${item.sellerName} replies: *"That is a bit too low, but I could meet in the middle at **₹${counterPrice}**. Or maybe ₹${offeredPrice} if you share your VTU exam prep notes for ${item.category === 'Books' ? 'Maths' : 'this semester'}! 😉"*`;
                } else {
                    reply = `Whoa! ₹${offeredPrice} is a huge lowball! That's less than half the listed value! \n\n${item.sellerName} says: *"Sorry, no way. This is in ${item.condition} condition. The lowest I can go is ₹${Math.round(item.price * 0.9)}."* \n\nLet's try a fairer offer!`;
                }
            } else {
                reply = `I can help you negotiate a discount! Try saying *"Offer ₹${Math.round(item.price * 0.85)}"* or *"Can I get a discount?"* and I will run it by ${item.sellerName}'s virtual clone!`;
            }
        } 
        else if (input.includes('meet') || input.includes('where') || input.includes('location') || input.includes('place')) {
            reply = `For convenience on the **VVCE Mysuru campus**, here are the best secure meeting spots: \n\n1. **VVCE Library Lobby** (Centrally located and quiet)\n2. **College Canteen Courtyard** (Great for a quick coffee and transaction)\n3. **Admin Block Entrance** (Centrally located near the parking lot)\n\nWhich of these would you like to propose to ${item.sellerName}?`;
        } 
        else if (input.includes('condition') || input.includes('quality') || input.includes('new') || input.includes('used')) {
            reply = `The item is listed in **${item.condition}** condition.\n\nDescription details: *"${item.description || "No description provided."}"* \n\nIf you want, I can ask ${item.sellerName} to upload more photos when you meet!`;
        }
        else {
            reply = `That's a good point! As the CampusLink AI Assistant, I highly recommend asking ${item.sellerName} about this directly. \n\nWould you like to propose a meeting near the **VVCE Library** or make an offer like **₹${Math.round(item.price * 0.9)}**?`;
        }

        return reply;
    },

    triggerSellerAutoReply(sellerEmail, userMessage) {
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        const seller = users.find(u => u.email === sellerEmail);
        if (!seller) return;

        const input = userMessage.toLowerCase();
        let replyText = "";

        if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('available')) {
            replyText = `Hey! Yes, it's still available. I've had a couple of other VVCE students ask, but you're first in line! Are you free to meet on campus today?`;
        } else if (input.includes('price') || input.includes('offer') || input.includes('negotiate') || input.includes('discount') || /\d+/.test(input)) {
            replyText = `Hmm, I'm already listing it pretty cheap, but since we're batchmates, I could drop it by ₹50 or ₹100 if we meet today. Does that work for you?`;
        } else if (input.includes('meet') || input.includes('where') || input.includes('location')) {
            replyText = `We can meet near the college canteen or inside the central library lobby. Let me know what time you're free!`;
        } else {
            replyText = `Sounds good! Let me know when you're free to meet. I have labs in the afternoon but I'm free during the lunch break!`;
        }

        setTimeout(() => {
            const buyerInboxKey = `cl_messages_${this.currentUser.email}`;
            const sellerInboxKey = `cl_messages_${sellerEmail}`;

            let buyerInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};
            let sellerInbox = JSON.parse(localStorage.getItem(sellerInboxKey)) || {};

            if (!buyerInbox[sellerEmail]) buyerInbox[sellerEmail] = [];
            if (!sellerInbox[this.currentUser.email]) sellerInbox[this.currentUser.email] = [];

            const newMsg = {
                sender: sellerEmail,
                text: replyText,
                timestamp: "Just now",
                unread: true
            };

            buyerInbox[sellerEmail].push(newMsg);
            sellerInbox[this.currentUser.email].push({ ...newMsg, unread: false });

            localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
            localStorage.setItem(sellerInboxKey, JSON.stringify(sellerInbox));

            if (this.activeChatEmail === sellerEmail) {
                this.renderChatPane();
            }
            this.renderChatSidebar();
            this.updateUnreadCountBadge();
        }, 2000);
    },

    openSwitchUserModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const container = document.getElementById('switch-user-list');
        if (!container) return;

        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        container.innerHTML = '';

        users.forEach(user => {
            const isCurrent = user.email === this.currentUser.email;
            const nameParts = user.name.split(' ');
            const initials = nameParts.map(p => p[0]).join('').toUpperCase().substring(0, 2);
            
            const card = document.createElement('div');
            card.className = 'switch-user-card';
            card.onclick = () => this.switchUserAccount(user.email);
            
            // Colorful brand backgrounds based on branch
            let avatarBg = '#f5c842';
            if (user.branch === 'CSE') avatarBg = '#8b5cf6';
            else if (user.branch === 'ISE') avatarBg = '#10b981';
            else if (user.branch === 'ECE') avatarBg = '#3b82f6';

            card.innerHTML = `
                <div class="switch-user-avatar" style="background: ${avatarBg}; color: #0e0f13;">${initials}</div>
                <div class="switch-user-info">
                    <div style="font-weight: 700; color: var(--text-main); display:flex; align-items:center; gap:5px;">${user.name} ${isCurrent ? '<span style="color:var(--accent-yellow); font-size:0.75rem;">(Active)</span>' : ''}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${user.branch} • Semester ${user.semester}</div>
                </div>
                <button class="btn btn-secondary" style="font-size: 0.7rem; padding: 0.25rem 0.6rem; height: 26px; border-radius: var(--radius-full); ${isCurrent ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${isCurrent ? 'disabled' : ''}>Login</button>
            `;
            container.appendChild(card);
        });

        this.openModal('switch-user-modal');
        if (window.lucide) lucide.createIcons();
    },

    switchUserAccount(email) {
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        const target = users.find(u => u.email === email);
        if (!target) return;

        localStorage.setItem('cl_current_user', JSON.stringify(target));
        this.currentUser = target;
        this.activeChatEmail = null;
        this.showToast(`Switched active session to ${target.name}!`, "success");
        this.closeModal('switch-user-modal');
        
        // Refresh application state
        this.checkAuthSession();
    },

    fetchOffers() {
        const localOffers = JSON.parse(localStorage.getItem('cl_offers')) || [];
        if (this.isSupabaseEnabled()) {
            return supabaseClient
                .from('offers')
                .select('*')
                .then(({ data, error }) => {
                    if (error) {
                        console.error("Error fetching cloud offers:", error);
                        return localOffers;
                    }
                    const cloudOffers = data || [];
                    const merged = [...localOffers];
                    cloudOffers.forEach(co => {
                        if (!merged.some(lo => lo.id === co.id)) {
                            merged.push(co);
                        }
                    });
                    return merged;
                })
                .then(offers => {
                    this.currentOffersCache = offers;
                    return offers;
                });
        } else {
            this.currentOffersCache = localOffers;
            return Promise.resolve(localOffers);
        }
    },

    openNegotiateModal(productId) {
        const listings = (this.currentListingsCache && this.currentListingsCache.length > 0) ? 
            this.currentListingsCache : 
            (JSON.parse(localStorage.getItem('cl_listings')) || []);
        const product = listings.find(p => String(p.id) === String(productId));
        if (!product) {
            this.showToast("Item not found", "error");
            return;
        }

        document.getElementById('negotiate-item-id').value = product.id;
        document.getElementById('negotiate-seller-email').value = product.sellerEmail || product.seller_email;
        document.getElementById('negotiate-item-title').textContent = product.title;
        document.getElementById('negotiate-asking-price').textContent = `₹${product.price.toLocaleString('en-IN')}`;
        document.getElementById('negotiate-proposed-price').value = '';
        
        this.openModal('negotiate-modal');
    },

    submitNegotiateOffer(event) {
        const itemId = parseInt(document.getElementById('negotiate-item-id').value);
        const sellerEmail = document.getElementById('negotiate-seller-email').value;
        const proposedPrice = parseFloat(document.getElementById('negotiate-proposed-price').value);

        if (isNaN(proposedPrice) || proposedPrice <= 0) {
            this.showToast("Please enter a valid price", "error");
            return;
        }

        const newOffer = {
            id: Date.now(),
            item_id: itemId,
            buyer_id: this.currentUser.email,
            buyer_name: this.currentUser.name,
            seller_id: sellerEmail,
            proposed_price: proposedPrice,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const itemTitle = document.getElementById('negotiate-item-title').textContent;
        this.sendOfferChatMessage(newOffer.buyer_id, newOffer.seller_id, newOffer.proposed_price, itemTitle);

        if (this.isSupabaseEnabled()) {
            supabaseClient
                .from('offers')
                .insert({
                    id: newOffer.id,
                    item_id: newOffer.item_id,
                    buyer_id: newOffer.buyer_id,
                    buyer_name: newOffer.buyer_name,
                    seller_id: newOffer.seller_id,
                    proposed_price: newOffer.proposed_price,
                    status: newOffer.status,
                    created_at: newOffer.created_at
                })
                .then(({ error }) => {
                    if (error) {
                        console.error("Supabase insert offer failed, falling back to local:", error);
                        this.saveOfferLocally(newOffer);
                    } else {
                        this.showToast("Offer sent successfully!", "success");
                    }
                    this.closeModal('negotiate-modal');
                    this.renderProducts();
                });
        } else {
            this.saveOfferLocally(newOffer);
            this.showToast("Offer sent successfully!", "success");
            this.closeModal('negotiate-modal');
            this.renderProducts();
        }
    },

    saveOfferLocally(offer) {
        const offers = JSON.parse(localStorage.getItem('cl_offers')) || [];
        offers.push(offer);
        localStorage.setItem('cl_offers', JSON.stringify(offers));
    },

    acceptNegotiationOffer(offerId, productId) {
        const offer = (this.currentOffersCache || []).find(o => String(o.id) === String(offerId)) || 
            ((JSON.parse(localStorage.getItem('cl_offers')) || []).find(o => String(o.id) === String(offerId)));
        if (offer) {
            const listings = (this.currentListingsCache && this.currentListingsCache.length > 0) ? 
                this.currentListingsCache : 
                (JSON.parse(localStorage.getItem('cl_listings')) || []);
            const listing = listings.find(p => String(p.id) === String(productId));
            const itemTitle = listing?.title || "listing";
            const acceptText = `✅ Offer Accepted: I have accepted your offer of ₹${offer.proposed_price.toLocaleString('en-IN')} on my listing: "${itemTitle}".`;
            this.sendSystemFeedbackChatMessage(offer.seller_id, offer.buyer_id, acceptText);
        }

        if (this.isSupabaseEnabled()) {
            supabaseClient
                .from('offers')
                .update({ status: 'accepted' })
                .eq('id', offerId)
                .then(({ error }) => {
                    if (error) throw error;
                    return supabaseClient
                        .from('offers')
                        .update({ status: 'declined' })
                        .eq('item_id', productId)
                        .eq('status', 'pending')
                        .neq('id', offerId);
                })
                .then(({ error }) => {
                    if (error) console.error("Error auto-declining other offers:", error);
                    this.showToast("Offer accepted! Item marked as Sold.", "success");
                    this.renderProducts();
                })
                .catch(err => {
                    console.error("Accept offer transaction failed:", err);
                    this.showToast("Failed to accept offer online, trying locally...", "warning");
                    this.acceptOfferLocally(offerId, productId);
                });
        } else {
            this.acceptOfferLocally(offerId, productId);
        }
    },

    acceptOfferLocally(offerId, productId) {
        const offers = JSON.parse(localStorage.getItem('cl_offers')) || [];
        offers.forEach(o => {
            if (String(o.id) === String(offerId)) {
                o.status = 'accepted';
            } else if (String(o.item_id) === String(productId) && o.status === 'pending') {
                o.status = 'declined';
            }
        });
        localStorage.setItem('cl_offers', JSON.stringify(offers));
        this.showToast("Offer accepted! Item marked as Sold.", "success");
        this.renderProducts();
    },

    declineNegotiationOffer(offerId) {
        const offer = (this.currentOffersCache || []).find(o => String(o.id) === String(offerId)) || 
            ((JSON.parse(localStorage.getItem('cl_offers')) || []).find(o => String(o.id) === String(offerId)));
        if (offer) {
            const listings = (this.currentListingsCache && this.currentListingsCache.length > 0) ? 
                this.currentListingsCache : 
                (JSON.parse(localStorage.getItem('cl_listings')) || []);
            const listing = listings.find(p => String(p.id) === String(offer.item_id));
            const itemTitle = listing?.title || "listing";
            const declineText = `❌ Offer Declined: I have declined your offer of ₹${offer.proposed_price.toLocaleString('en-IN')} on my listing: "${itemTitle}".`;
            this.sendSystemFeedbackChatMessage(offer.seller_id, offer.buyer_id, declineText);
        }

        if (this.isSupabaseEnabled()) {
            supabaseClient
                .from('offers')
                .update({ status: 'declined' })
                .eq('id', offerId)
                .then(({ error }) => {
                    if (error) throw error;
                    this.showToast("Offer declined.", "info");
                    this.renderProducts();
                })
                .catch(err => {
                    console.error("Decline offer online failed:", err);
                    this.declineOfferLocally(offerId);
                });
        } else {
            this.declineOfferLocally(offerId);
        }
    },

    declineOfferLocally(offerId) {
        const offers = JSON.parse(localStorage.getItem('cl_offers')) || [];
        const target = offers.find(o => String(o.id) === String(offerId));
        if (target) {
            target.status = 'declined';
            localStorage.setItem('cl_offers', JSON.stringify(offers));
            this.showToast("Offer declined.", "info");
            this.renderProducts();
        }
    },

    sendOfferChatMessage(buyerEmail, sellerEmail, proposedPrice, itemTitle) {
        const text = `🚨 Price Proposal: I would like to make an offer of ₹${proposedPrice.toLocaleString('en-IN')} on your listing: "${itemTitle}".`;
        
        if (this.isSupabaseEnabled()) {
            const roomId = this.getChatRoomId(buyerEmail, sellerEmail);
            const cloudMsg = {
                sender: buyerEmail,
                text: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                unread: true
            };

            supabaseClient.from("chats").select("messages").eq("room_id", roomId).maybeSingle().then(({ data, error }) => {
                if (error) throw error;
                const messages = data ? (data.messages || []) : [];
                messages.push(cloudMsg);
                
                return supabaseClient.from("chats").upsert({
                    room_id: roomId,
                    user_a: buyerEmail,
                    user_b: sellerEmail,
                    messages: messages
                });
            }).catch((err) => {
                console.error("Offers chat message cloud write failed:", err);
                this.sendOfferChatMessageLocally(buyerEmail, sellerEmail, text);
            });
        } else {
            this.sendOfferChatMessageLocally(buyerEmail, sellerEmail, text);
        }
    },

    sendSystemFeedbackChatMessage(senderEmail, recipientEmail, text) {
        if (this.isSupabaseEnabled()) {
            const roomId = this.getChatRoomId(senderEmail, recipientEmail);
            const cloudMsg = {
                sender: senderEmail,
                text: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                unread: true
            };

            supabaseClient.from("chats").select("messages").eq("room_id", roomId).maybeSingle().then(({ data, error }) => {
                if (error) throw error;
                const messages = data ? (data.messages || []) : [];
                messages.push(cloudMsg);
                
                return supabaseClient.from("chats").upsert({
                    room_id: roomId,
                    user_a: senderEmail,
                    user_b: recipientEmail,
                    messages: messages
                });
            }).catch(err => {
                console.error("System feedback message online failed, running locally:", err);
                this.sendOfferChatMessageLocally(senderEmail, recipientEmail, text);
            });
        } else {
            this.sendOfferChatMessageLocally(senderEmail, recipientEmail, text);
        }
    },

    sendOfferChatMessageLocally(buyerEmail, sellerEmail, text) {
        const buyerInboxKey = `cl_messages_${buyerEmail}`;
        const sellerInboxKey = `cl_messages_${sellerEmail}`;
        
        let buyerInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};
        let sellerInbox = JSON.parse(localStorage.getItem(sellerInboxKey)) || {};

        const msg = {
            sender: buyerEmail,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: false
        };

        if (!buyerInbox[sellerEmail]) buyerInbox[sellerEmail] = [];
        buyerInbox[sellerEmail].push(msg);

        const recipientMsg = { ...msg, unread: true };
        if (!sellerInbox[buyerEmail]) sellerInbox[buyerEmail] = [];
        sellerInbox[buyerEmail].push(recipientMsg);

        localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
        localStorage.setItem(sellerInboxKey, JSON.stringify(sellerInbox));
    },

    // === ADMIN DASHBOARD ACTIONS ===
    loadAdminTab(tabName) {
        this.currentAdminTab = tabName;
        const tabs = ['overview', 'events', 'announcements', 'listings', 'teams', 'forum', 'users'];
        tabs.forEach(t => {
            const btn = document.getElementById(`admin-tab-${t}`);
            if (btn) {
                if (t === tabName) {
                    btn.style.background = 'rgba(245, 200, 66, 0.08)';
                    btn.style.color = '#f5c842';
                    btn.style.borderLeft = '3px solid #f5c842';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = '#8b8b9a';
                    btn.style.borderLeft = '3px solid transparent';
                }
            }
        });

        if (tabName === 'overview') {
            this.renderAdminOverview();
        } else if (tabName === 'events') {
            this.renderAdminEvents();
        } else if (tabName === 'announcements') {
            this.renderAdminAnnouncements();
        } else if (tabName === 'listings') {
            this.renderAdminListings();
        } else if (tabName === 'teams') {
            this.renderAdminTeams();
        } else if (tabName === 'forum') {
            this.renderAdminForum();
        } else if (tabName === 'users') {
            this.renderAdminUsers();
        }
    },

    openAdminModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });
        }
    },

    closeAdminModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
        // Reset forms if applicable
        if (modalId === 'admin-event-modal') {
            document.getElementById('admin-event-form').reset();
            document.getElementById('admin-event-id').value = '';
            document.getElementById('admin-event-modal-title').textContent = 'New Event';
            document.getElementById('admin-event-submit-btn').textContent = 'Create Event';
        } else if (modalId === 'admin-announcement-modal') {
            document.getElementById('admin-announcement-form').reset();
            document.getElementById('admin-announcement-id').value = '';
            document.getElementById('admin-announcement-modal-title').textContent = 'New Announcement';
            document.getElementById('admin-announcement-submit-btn').textContent = 'Post Announcement';
        }
    },

    renderAdminOverview() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">Dashboard Overview</h1>
                    <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Quick statistics and health of the CampusLink application platform.</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 40px;">
                    <div style="background: #131316; border: 1px solid #2a2a33; border-radius: 12px; padding: 24px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #8b8b9a; text-transform: uppercase; letter-spacing: 0.05em;">Total Users</div>
                            <div style="font-size: 32px; font-weight: 700; color: #f0f0f4; margin-top: 8px; font-family: 'JetBrains Mono', monospace;" id="admin-stat-users">-</div>
                        </div>
                        <div style="background: rgba(108, 99, 255, 0.1); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6C63FF;">
                            <i data-lucide="users" style="width: 24px; height: 24px;"></i>
                        </div>
                    </div>

                    <div style="background: #131316; border: 1px solid #2a2a33; border-radius: 12px; padding: 24px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #8b8b9a; text-transform: uppercase; letter-spacing: 0.05em;">Marketplace Listings</div>
                            <div style="font-size: 32px; font-weight: 700; color: #f0f0f4; margin-top: 8px; font-family: 'JetBrains Mono', monospace;" id="admin-stat-listings">-</div>
                        </div>
                        <div style="background: rgba(245, 200, 66, 0.1); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #f5c842;">
                            <i data-lucide="shopping-bag" style="width: 24px; height: 24px;"></i>
                        </div>
                    </div>

                    <div style="background: #131316; border: 1px solid #2a2a33; border-radius: 12px; padding: 24px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #8b8b9a; text-transform: uppercase; letter-spacing: 0.05em;">Active Teams</div>
                            <div style="font-size: 32px; font-weight: 700; color: #f0f0f4; margin-top: 8px; font-family: 'JetBrains Mono', monospace;" id="admin-stat-teams">-</div>
                        </div>
                        <div style="background: rgba(108, 99, 255, 0.1); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6C63FF;">
                            <i data-lucide="users-2" style="width: 24px; height: 24px;"></i>
                        </div>
                    </div>

                    <div style="background: #131316; border: 1px solid #2a2a33; border-radius: 12px; padding: 24px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #8b8b9a; text-transform: uppercase; letter-spacing: 0.05em;">Forum Threads</div>
                            <div style="font-size: 32px; font-weight: 700; color: #f0f0f4; margin-top: 8px; font-family: 'JetBrains Mono', monospace;" id="admin-stat-posts">-</div>
                        </div>
                        <div style="background: rgba(245, 200, 66, 0.1); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #f5c842;">
                            <i data-lucide="message-square" style="width: 24px; height: 24px;"></i>
                        </div>
                    </div>
                </div>

                <div style="background: #131316; border: 1px solid #2a2a33; border-radius: 12px; padding: 28px;">
                    <h3 style="font-size: 18px; font-weight: 700; color: #f0f0f4; margin: 0 0 8px 0;">Admin Actions Quickstart</h3>
                    <p style="font-size: 14px; color: #8b8b9a; margin: 0 0 24px 0;">Use the sidebar console or shortcut buttons below to quickly manage events and notifications.</p>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                        <button onclick="app.loadAdminTab('events')" class="admin-btn admin-btn-primary" style="display: flex; align-items: center; gap: 8px; padding: 12px 20px;">
                            <i data-lucide="calendar" style="width: 16px; height: 16px;"></i> Manage Events
                        </button>
                        <button onclick="app.loadAdminTab('announcements')" class="admin-btn admin-btn-secondary" style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; border: 1px solid #2a2a33; color: #f0f0f4;">
                            <i data-lucide="megaphone" style="width: 16px; height: 16px;"></i> Manage Announcements
                        </button>
                        <button onclick="app.loadAdminTab('users')" class="admin-btn admin-btn-secondary" style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; border: 1px solid #2a2a33; color: #f0f0f4;">
                            <i data-lucide="shield-alert" style="width: 16px; height: 16px;"></i> User Roles Manager
                        </button>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        this.fetchAdminOverviewData();
    },

    fetchAdminOverviewData() {
        const usersEl = document.getElementById('admin-stat-users');
        const listingsEl = document.getElementById('admin-stat-listings');
        const teamsEl = document.getElementById('admin-stat-teams');
        const postsEl = document.getElementById('admin-stat-posts');

        if (this.isSupabaseEnabled()) {
            Promise.all([
                supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
                supabaseClient.from('listings').select('*', { count: 'exact', head: true }),
                supabaseClient.from('teams').select('*', { count: 'exact', head: true }),
                supabaseClient.from('reddit_posts').select('*', { count: 'exact', head: true })
            ]).then(([profilesRes, listingsRes, teamsRes, postsRes]) => {
                if (usersEl) usersEl.textContent = profilesRes.count !== null ? profilesRes.count : '-';
                if (listingsEl) listingsEl.textContent = listingsRes.count !== null ? listingsRes.count : '-';
                if (teamsEl) teamsEl.textContent = teamsRes.count !== null ? teamsRes.count : '-';
                if (postsEl) postsEl.textContent = postsRes.count !== null ? postsRes.count : '-';
            }).catch(err => {
                console.error("Failed to fetch admin overview metrics from Supabase:", err);
                this.fetchAdminOverviewDataLocally(usersEl, listingsEl, teamsEl, postsEl);
            });
        } else {
            this.fetchAdminOverviewDataLocally(usersEl, listingsEl, teamsEl, postsEl);
        }
    },

    fetchAdminOverviewDataLocally(usersEl, listingsEl, teamsEl, postsEl) {
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
        const posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];

        if (usersEl) usersEl.textContent = users.length;
        if (listingsEl) listingsEl.textContent = listings.length;
        if (teamsEl) teamsEl.textContent = teams.length;
        if (postsEl) postsEl.textContent = posts.length;
    },

    renderAdminEvents() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                    <div>
                        <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">Campus Events</h1>
                        <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Create, edit, and delete academic/cultural events for the students.</p>
                    </div>
                    <button onclick="app.openCreateEventModal()" class="admin-btn admin-btn-primary" style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Event
                    </button>
                </div>

                <div class="admin-table-container">
                    <div class="admin-table-row header" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 120px;">
                        <div>Title / Type</div>
                        <div>Date & Time</div>
                        <div>Venue</div>
                        <div>Status</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    <div id="admin-events-list">
                        <div style="padding: 40px; text-align: center; color: #8b8b9a;">Loading events...</div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        this.fetchAdminEvents();
    },

    fetchAdminEvents() {
        const listEl = document.getElementById('admin-events-list');
        if (!listEl) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('events').select('*').order('date', { ascending: true }).then(({ data, error }) => {
                if (error) throw error;
                this.renderEventsList(data || []);
            }).catch(err => {
                console.error("Failed to fetch events from Supabase:", err);
                const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
                this.renderEventsList(localEvents);
            });
        } else {
            const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
            localEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
            this.renderEventsList(localEvents);
        }
    },

    renderEventsList(events) {
        const listEl = document.getElementById('admin-events-list');
        if (!listEl) return;

        if (events.length === 0) {
            listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #8b8b9a;">No campus events registered yet.</div>';
            return;
        }

        listEl.innerHTML = '';
        events.forEach(evt => {
            const row = document.createElement('div');
            row.className = 'admin-table-row';
            row.style.gridTemplateColumns = '2fr 1.2fr 1fr 1fr 120px';

            const timeStr = evt.time ? evt.time.slice(0, 5) : 'All Day';
            const isFeaturedBadge = evt.is_featured ? '<span style="background: rgba(245, 200, 66, 0.15); color: #f5c842; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px;">FEATURED</span>' : '';
            const typeStr = evt.event_type ? evt.event_type.charAt(0).toUpperCase() + evt.event_type.slice(1) : 'Other';

            row.innerHTML = `
                <div>
                    <div style="font-weight: 600; color: #f0f0f4; display: flex; align-items: center; gap: 4px;">
                        ${evt.title} ${isFeaturedBadge}
                    </div>
                    <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px;">Type: ${typeStr}</div>
                </div>
                <div style="font-family: 'JetBrains Mono', monospace; color: #f0f0f4;">
                    <div>${evt.date}</div>
                    <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px;">${timeStr}</div>
                </div>
                <div style="color: #f0f0f4;">${evt.venue || 'TBD'}</div>
                <div>
                    ${new Date(evt.date) >= new Date().setHours(0,0,0,0) ? '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">Upcoming</span>' : '<span style="background: rgba(255, 255, 255, 0.05); color: #8b8b9a; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">Past</span>'}
                </div>
                <div style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="app.openEditEventModal('${evt.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#f5c842'" onmouseout="this.style.color='#8b8b9a'" title="Edit Event">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button onclick="app.deleteAdminEvent('${evt.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Event">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            `;
            listEl.appendChild(row);
        });

        if (window.lucide) lucide.createIcons();
    },

    openCreateEventModal() {
        document.getElementById('admin-event-modal-title').textContent = 'New Campus Event';
        document.getElementById('admin-event-submit-btn').textContent = 'Create Event';
        document.getElementById('admin-event-id').value = '';
        document.getElementById('admin-event-form').reset();
        this.openAdminModal('admin-event-modal');
    },

    openEditEventModal(eventId) {
        document.getElementById('admin-event-modal-title').textContent = 'Edit Campus Event';
        document.getElementById('admin-event-submit-btn').textContent = 'Save Changes';
        document.getElementById('admin-event-id').value = eventId;

        const fillForm = (evt) => {
            document.getElementById('admin-event-title').value = evt.title || '';
            document.getElementById('admin-event-date').value = evt.date || '';
            document.getElementById('admin-event-time').value = evt.time ? evt.time.slice(0, 5) : '';
            document.getElementById('admin-event-type').value = evt.event_type || 'technical';
            document.getElementById('admin-event-venue').value = evt.venue || '';
            document.getElementById('admin-event-description').value = evt.description || '';
            document.getElementById('admin-event-link').value = evt.registration_link || '';
            document.getElementById('admin-event-featured').checked = !!evt.is_featured;
            this.openAdminModal('admin-event-modal');
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('events').select('*').eq('id', eventId).maybeSingle().then(({ data, error }) => {
                if (error) throw error;
                if (data) fillForm(data);
            }).catch(err => {
                console.error("Failed to load event for editing:", err);
                const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
                const target = localEvents.find(e => e.id === eventId || e.id == eventId);
                if (target) fillForm(target);
            });
        } else {
            const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
            const target = localEvents.find(e => e.id === eventId || e.id == eventId);
            if (target) fillForm(target);
        }
    },

    handleAdminEventSubmit(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('admin-event-submit-btn');
        const origBtnText = submitBtn ? submitBtn.textContent : 'Create Event';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        const id = document.getElementById('admin-event-id').value;
        const title = document.getElementById('admin-event-title').value.trim();
        const date = document.getElementById('admin-event-date').value;
        const timeInput = document.getElementById('admin-event-time').value;
        const time = timeInput ? timeInput + ":00" : null;
        const event_type = document.getElementById('admin-event-type').value;
        const venue = document.getElementById('admin-event-venue').value.trim();
        const description = document.getElementById('admin-event-description').value.trim();
        let registration_link = document.getElementById('admin-event-link').value.trim();
        if (registration_link && !/^https?:\/\//i.test(registration_link)) {
            registration_link = 'https://' + registration_link;
        }
        const is_featured = document.getElementById('admin-event-featured').checked;

        const resetBtn = () => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = origBtnText;
            }
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                const userId = session && session.user ? session.user.id : null;
                const eventData = {
                    title,
                    date,
                    time,
                    event_type,
                    venue: venue || null,
                    description: description || null,
                    registration_link: registration_link || null,
                    is_featured,
                    updated_at: new Date().toISOString()
                };

                let promise;
                if (id) {
                    promise = supabaseClient.from('events').update(eventData).eq('id', id);
                } else {
                    eventData.created_by = userId;
                    promise = supabaseClient.from('events').insert(eventData);
                }

                return promise;
            }).then(({ error }) => {
                resetBtn();
                if (error) throw error;
                this.showToast(id ? "Event updated successfully!" : "Event created successfully!", "success");
                this.closeAdminModal('admin-event-modal');
                this.fetchAdminEvents();
            }).catch(err => {
                resetBtn();
                console.error("Failed to save event to Supabase:", err);
                this.showToast("Failed to save event. Trying local database fallback...", "warning");
                this.handleAdminEventSubmitLocally(id, { title, date, time, event_type, venue, description, registration_link, is_featured });
            });
        } else {
            resetBtn();
            this.handleAdminEventSubmitLocally(id, { title, date, time, event_type, venue, description, registration_link, is_featured });
        }
    },

    handleAdminEventSubmitLocally(id, eventData) {
        const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
        eventData.updated_at = new Date().toISOString();
        if (id) {
            const index = localEvents.findIndex(e => e.id === id || e.id == id);
            if (index !== -1) {
                localEvents[index] = { ...localEvents[index], ...eventData };
            }
        } else {
            eventData.id = "local-event-" + Date.now();
            eventData.created_at = new Date().toISOString();
            localEvents.push(eventData);
        }
        localStorage.setItem('cl_events', JSON.stringify(localEvents));
        this.showToast(id ? "Event updated locally!" : "Event created locally!", "success");
        this.closeAdminModal('admin-event-modal');
        this.fetchAdminEvents();
    },

    deleteAdminEvent(eventId) {
        if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('events').delete().eq('id', eventId).then(({ error }) => {
                if (error) throw error;
                this.showToast("Event deleted successfully!", "info");
                this.fetchAdminEvents();
            }).catch(err => {
                console.error("Failed to delete event from Supabase:", err);
                this.deleteAdminEventLocally(eventId);
            });
        } else {
            this.deleteAdminEventLocally(eventId);
        }
    },

    deleteAdminEventLocally(eventId) {
        const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
        const updated = localEvents.filter(e => e.id !== eventId && e.id != eventId);
        localStorage.setItem('cl_events', JSON.stringify(updated));
        this.showToast("Event deleted locally!", "info");
        this.fetchAdminEvents();
    },

    renderAdminAnnouncements() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                    <div>
                        <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">Campus Announcements</h1>
                        <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Publish emergency banners or notifications directly on the student home feed.</p>
                    </div>
                    <button onclick="app.openCreateAnnouncementModal()" class="admin-btn admin-btn-primary" style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Announcement
                    </button>
                </div>

                <div class="admin-table-container">
                    <div class="admin-table-row header" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 120px;">
                        <div>Title / Priority</div>
                        <div>Posted Date</div>
                        <div>Expiration</div>
                        <div>Status</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    <div id="admin-announcements-list">
                        <div style="padding: 40px; text-align: center; color: #8b8b9a;">Loading announcements...</div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        this.fetchAdminAnnouncements();
    },

    fetchAdminAnnouncements() {
        const listEl = document.getElementById('admin-announcements-list');
        if (!listEl) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('announcements').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
                if (error) throw error;
                this.renderAnnouncementsList(data || []);
            }).catch(err => {
                console.error("Failed to fetch announcements from Supabase:", err);
                const localAnn = JSON.parse(localStorage.getItem('cl_announcements')) || [];
                this.renderAnnouncementsList(localAnn);
            });
        } else {
            const localAnn = JSON.parse(localStorage.getItem('cl_announcements')) || [];
            localAnn.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            this.renderAnnouncementsList(localAnn);
        }
    },

    renderAnnouncementsList(anns) {
        const listEl = document.getElementById('admin-announcements-list');
        if (!listEl) return;

        if (anns.length === 0) {
            listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #8b8b9a;">No announcements posted yet.</div>';
            return;
        }

        listEl.innerHTML = '';
        anns.forEach(ann => {
            const row = document.createElement('div');
            row.className = 'admin-table-row';
            row.style.gridTemplateColumns = '2fr 1.2fr 1fr 1fr 120px';

            const createdDate = new Date(ann.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const expiresStr = ann.expires_at ? new Date(ann.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';
            
            let priorityBadge = '';
            if (ann.priority === 'urgent') {
                priorityBadge = '<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px;">URGENT</span>';
            } else if (ann.priority === 'high') {
                priorityBadge = '<span style="background: rgba(245, 200, 66, 0.15); color: #f5c842; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px;">HIGH</span>';
            } else if (ann.priority === 'normal') {
                priorityBadge = '<span style="background: rgba(108, 99, 255, 0.15); color: #6C63FF; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px;">NORMAL</span>';
            } else {
                priorityBadge = '<span style="background: rgba(255, 255, 255, 0.05); color: #8b8b9a; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px;">LOW</span>';
            }

            const isExpired = ann.expires_at ? new Date(ann.expires_at) < new Date() : false;
            let statusBadge = '';
            if (!ann.is_active) {
                statusBadge = '<span style="background: rgba(255, 255, 255, 0.05); color: #8b8b9a; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">Inactive</span>';
            } else if (isExpired) {
                statusBadge = '<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">Expired</span>';
            } else {
                statusBadge = '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">Active</span>';
            }

            const activeIcon = ann.is_active ? 'eye' : 'eye-off';
            const toggleTitle = ann.is_active ? 'Deactivate Announcement' : 'Activate Announcement';

            row.innerHTML = `
                <div>
                    <div style="font-weight: 600; color: #f0f0f4; display: flex; align-items: center;">${ann.title} ${priorityBadge}</div>
                    <div style="font-size: 12px; color: #8b8b9a; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${ann.body}</div>
                </div>
                <div style="font-family: 'JetBrains Mono', monospace; color: #f0f0f4;">${createdDate}</div>
                <div style="font-family: 'JetBrains Mono', monospace; color: #f0f0f4; font-size: 12px;">${expiresStr}</div>
                <div>${statusBadge}</div>
                <div style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="app.toggleAdminAnnouncementStatus('${ann.id}', ${ann.is_active})" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#f5c842'" onmouseout="this.style.color='#8b8b9a'" title="${toggleTitle}">
                        <i data-lucide="${activeIcon}" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button onclick="app.openEditAnnouncementModal('${ann.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#f5c842'" onmouseout="this.style.color='#8b8b9a'" title="Edit Details">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button onclick="app.deleteAdminAnnouncement('${ann.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Notice">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            `;
            listEl.appendChild(row);
        });

        if (window.lucide) lucide.createIcons();
    },

    openCreateAnnouncementModal() {
        document.getElementById('admin-announcement-modal-title').textContent = 'New Campus Announcement';
        document.getElementById('admin-announcement-submit-btn').textContent = 'Post Announcement';
        document.getElementById('admin-announcement-id').value = '';
        document.getElementById('admin-announcement-form').reset();
        document.getElementById('admin-announcement-active').checked = true;
        this.openAdminModal('admin-announcement-modal');
    },

    openEditAnnouncementModal(annId) {
        document.getElementById('admin-announcement-modal-title').textContent = 'Edit Announcement';
        document.getElementById('admin-announcement-submit-btn').textContent = 'Save Changes';
        document.getElementById('admin-announcement-id').value = annId;

        const fillForm = (ann) => {
            document.getElementById('admin-announcement-title').value = ann.title || '';
            document.getElementById('admin-announcement-body').value = ann.body || '';
            document.getElementById('admin-announcement-priority').value = ann.priority || 'normal';
            document.getElementById('admin-announcement-active').checked = !!ann.is_active;
            
            if (ann.expires_at) {
                const d = new Date(ann.expires_at);
                const pad = (n) => String(n).padStart(2, '0');
                const localStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                document.getElementById('admin-announcement-expires').value = localStr;
            } else {
                document.getElementById('admin-announcement-expires').value = '';
            }

            this.openAdminModal('admin-announcement-modal');
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('announcements').select('*').eq('id', annId).maybeSingle().then(({ data, error }) => {
                if (error) throw error;
                if (data) fillForm(data);
            }).catch(err => {
                console.error("Failed to load announcement for editing:", err);
                const localAnns = JSON.parse(localStorage.getItem('cl_announcements')) || [];
                const target = localAnns.find(a => a.id === annId || a.id == annId);
                if (target) fillForm(target);
            });
        } else {
            const localAnns = JSON.parse(localStorage.getItem('cl_announcements')) || [];
            const target = localAnns.find(a => a.id === annId || a.id == annId);
            if (target) fillForm(target);
        }
    },

    handleAdminAnnouncementSubmit(event) {
        event.preventDefault();

        const submitBtn = document.getElementById('admin-announcement-submit-btn');
        const origBtnText = submitBtn ? submitBtn.textContent : 'Post Announcement';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        const id = document.getElementById('admin-announcement-id').value;
        const title = document.getElementById('admin-announcement-title').value.trim();
        const body = document.getElementById('admin-announcement-body').value.trim();
        const priority = document.getElementById('admin-announcement-priority').value;
        const is_active = document.getElementById('admin-announcement-active').checked;
        const expiresVal = document.getElementById('admin-announcement-expires').value;
        const expires_at = expiresVal ? new Date(expiresVal).toISOString() : null;

        const resetBtn = () => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = origBtnText;
            }
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                const userId = session && session.user ? session.user.id : null;
                const annData = {
                    title,
                    body,
                    priority,
                    is_active,
                    expires_at
                };

                let promise;
                if (id) {
                    promise = supabaseClient.from('announcements').update(annData).eq('id', id);
                } else {
                    annData.created_by = userId;
                    promise = supabaseClient.from('announcements').insert(annData);
                }

                return promise;
            }).then(({ error }) => {
                resetBtn();
                if (error) throw error;
                this.showToast(id ? "Announcement saved!" : "Announcement published!", "success");
                this.closeAdminModal('admin-announcement-modal');
                this.fetchAdminAnnouncements();
            }).catch(err => {
                resetBtn();
                console.error("Failed to save announcement to Supabase:", err);
                this.showToast("Failed to write to Cloud. Writing locally...", "warning");
                this.handleAdminAnnouncementSubmitLocally(id, { title, body, priority, is_active, expires_at });
            });
        } else {
            resetBtn();
            this.handleAdminAnnouncementSubmitLocally(id, { title, body, priority, is_active, expires_at });
        }
    },

    handleAdminAnnouncementSubmitLocally(id, annData) {
        const localAnns = JSON.parse(localStorage.getItem('cl_announcements')) || [];
        if (id) {
            const index = localAnns.findIndex(a => a.id === id || a.id == id);
            if (index !== -1) {
                localAnns[index] = { ...localAnns[index], ...annData };
            }
        } else {
            annData.id = "local-ann-" + Date.now();
            annData.created_at = new Date().toISOString();
            localAnns.push(annData);
        }
        localStorage.setItem('cl_announcements', JSON.stringify(localAnns));
        this.showToast(id ? "Announcement saved locally!" : "Announcement posted locally!", "success");
        this.closeAdminModal('admin-announcement-modal');
        this.fetchAdminAnnouncements();
    },

    toggleAdminAnnouncementStatus(annId, currentVal) {
        const newVal = !currentVal;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('announcements').update({ is_active: newVal }).eq('id', annId).then(({ error }) => {
                if (error) throw error;
                this.showToast(newVal ? "Announcement activated" : "Announcement deactivated", "success");
                this.fetchAdminAnnouncements();
            }).catch(err => {
                console.error("Failed to toggle announcement in Supabase:", err);
                this.toggleAdminAnnouncementStatusLocally(annId, newVal);
            });
        } else {
            this.toggleAdminAnnouncementStatusLocally(annId, newVal);
        }
    },

    toggleAdminAnnouncementStatusLocally(annId, newVal) {
        const localAnns = JSON.parse(localStorage.getItem('cl_announcements')) || [];
        const index = localAnns.findIndex(a => a.id === annId || a.id == annId);
        if (index !== -1) {
            localAnns[index].is_active = newVal;
        }
        localStorage.setItem('cl_announcements', JSON.stringify(localAnns));
        this.showToast(newVal ? "Announcement activated locally" : "Announcement deactivated locally", "success");
        this.fetchAdminAnnouncements();
    },

    deleteAdminAnnouncement(annId) {
        if (!confirm("Are you sure you want to delete this announcement notice?")) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('announcements').delete().eq('id', annId).then(({ error }) => {
                if (error) throw error;
                this.showToast("Announcement deleted successfully!", "info");
                this.fetchAdminAnnouncements();
            }).catch(err => {
                console.error("Failed to delete notice from Supabase:", err);
                this.deleteAdminAnnouncementLocally(annId);
            });
        } else {
            this.deleteAdminAnnouncementLocally(annId);
        }
    },

    deleteAdminAnnouncementLocally(annId) {
        const localAnns = JSON.parse(localStorage.getItem('cl_announcements')) || [];
        const updated = localAnns.filter(a => a.id !== annId && a.id != annId);
        localStorage.setItem('cl_announcements', JSON.stringify(updated));
        this.showToast("Announcement deleted locally!", "info");
        this.fetchAdminAnnouncements();
    },

    renderAdminUsers() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">User Role Manager</h1>
                    <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Promote students to administrator access or demote admin privileges.</p>
                </div>

                <div style="margin-bottom: 24px; display: flex; gap: 12px; max-width: 480px;">
                    <div style="position: relative; flex: 1;">
                        <input type="text" id="admin-user-search" class="admin-form-control" placeholder="Search by name or email..." style="padding-left: 36px;" oninput="app.fetchAdminUsers(this.value)">
                        <i data-lucide="search" style="position: absolute; left: 12px; top: 12px; width: 16px; height: 16px; color: #8b8b9a;"></i>
                    </div>
                </div>

                <div class="admin-table-container">
                    <div class="admin-table-row header" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 120px;">
                        <div>Name / Email</div>
                        <div>Branch</div>
                        <div>Semester</div>
                        <div>Role</div>
                        <div style="text-align: right;">Action</div>
                    </div>
                    <div id="admin-users-list">
                        <div style="padding: 40px; text-align: center; color: #8b8b9a;">Loading user accounts...</div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        this.fetchAdminUsers();
    },

    fetchAdminUsers(searchQuery = "") {
        const listEl = document.getElementById('admin-users-list');
        if (!listEl) return;

        const cleanQuery = searchQuery.toLowerCase().trim();

        if (this.isSupabaseEnabled()) {
            Promise.all([
                supabaseClient.from('users').select('*'),
                supabaseClient.from('profiles').select('email, role')
            ]).then(([usersRes, profilesRes]) => {
                if (usersRes.error) throw usersRes.error;
                
                const profilesMap = {};
                (profilesRes.data || []).forEach(p => {
                    profilesMap[p.email] = p.role || 'student';
                });

                const unifiedUsers = (usersRes.data || []).map(u => ({
                    ...u,
                    role: profilesMap[u.email] || 'student'
                }));

                const filtered = unifiedUsers.filter(u => 
                    u.name.toLowerCase().includes(cleanQuery) || 
                    u.email.toLowerCase().includes(cleanQuery)
                );

                this.renderUsersList(filtered);
            }).catch(err => {
                console.error("Failed to fetch users from Supabase:", err);
                this.fetchAdminUsersLocally(cleanQuery);
            });
        } else {
            this.fetchAdminUsersLocally(cleanQuery);
        }
    },

    fetchAdminUsersLocally(cleanQuery = "") {
        const localUsers = JSON.parse(localStorage.getItem('cl_users')) || [];
        
        const filtered = localUsers.map(u => {
            if (!u.role) {
                u.role = (u.email === 'admin@vvce.ac.in' || u.email === 'vvce25cse0197@vvce.ac.in') ? 'admin' : 'student';
            }
            return u;
        }).filter(u => 
            u.name.toLowerCase().includes(cleanQuery) || 
            u.email.toLowerCase().includes(cleanQuery)
        );

        this.renderUsersList(filtered);
    },

    renderUsersList(users) {
        const listEl = document.getElementById('admin-users-list');
        if (!listEl) return;

        if (users.length === 0) {
            listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #8b8b9a;">No user accounts match your search.</div>';
            return;
        }

        listEl.innerHTML = '';
        users.forEach(u => {
            const row = document.createElement('div');
            row.className = 'admin-table-row';
            row.style.gridTemplateColumns = '2fr 1.2fr 1fr 1fr 120px';

            const roleBadge = u.role === 'admin' 
                ? '<span style="background: rgba(245, 200, 66, 0.15); color: #f5c842; font-size: 11px; padding: 4px 10px; border-radius: 12px; font-weight: 700;">Administrator</span>'
                : '<span style="background: rgba(108, 99, 255, 0.1); color: #6C63FF; font-size: 11px; padding: 4px 10px; border-radius: 12px; font-weight: 600;">Student</span>';

            const buttonText = u.role === 'admin' ? 'Demote' : 'Promote';
            const buttonColor = u.role === 'admin' ? '#ef4444' : '#f5c842';
            
            const isSelf = u.email === this.currentUser.email;
            const isSystemOwner = u.email === 'vvce25cse0197@vvce.ac.in';
            const disableAction = (isSelf || isSystemOwner) ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : '';

            row.innerHTML = `
                <div>
                    <div style="font-weight: 600; color: #f0f0f4;">${u.name}</div>
                    <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px; font-family: 'JetBrains Mono', monospace;">${u.email}</div>
                </div>
                <div style="color: #f0f0f4;">${u.branch || 'CSE'}</div>
                <div style="color: #f0f0f4;">Sem ${u.semester || '6'}</div>
                <div>${roleBadge}</div>
                <div style="text-align: right;">
                    <button ${disableAction} onclick="app.toggleAdminUserRole('${u.email}', '${u.role}')" class="admin-btn" style="padding: 6px 12px; font-size: 12px; background: transparent; border: 1px solid ${buttonColor}; color: ${buttonColor}; font-weight: 600; transition: all 0.15s ease;" onmouseover="if(!this.disabled){this.style.background='${buttonColor}'; this.style.color='#0d0d0f'}" onmouseout="if(!this.disabled){this.style.background='transparent'; this.style.color='${buttonColor}'}">
                        ${buttonText}
                    </button>
                </div>
            `;
            listEl.appendChild(row);
        });

        if (window.lucide) lucide.createIcons();
    },

    toggleAdminUserRole(email, currentRole) {
        const newRole = currentRole === 'admin' ? 'student' : 'admin';
        const actionStr = newRole === 'admin' ? 'promote this user to Administrator' : 'demote this administrator to Student';
        
        if (!confirm(`Are you sure you want to ${actionStr}?`)) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('profiles').update({ role: newRole }).eq('email', email).then(({ error }) => {
                if (error) throw error;
                this.showToast(`User role successfully changed to ${newRole}!`, "success");
                this.fetchAdminUsers(document.getElementById('admin-user-search')?.value || "");
            }).catch(err => {
                console.error("Failed to alter profile role in Supabase:", err);
                this.toggleAdminUserRoleLocally(email, newRole);
            });
        } else {
            this.toggleAdminUserRoleLocally(email, newRole);
        }
    },

    toggleAdminUserRoleLocally(email, newRole) {
        const localUsers = JSON.parse(localStorage.getItem('cl_users')) || [];
        const index = localUsers.findIndex(u => u.email === email);
        if (index !== -1) {
            localUsers[index].role = newRole;
            localStorage.setItem('cl_users', JSON.stringify(localUsers));
            this.showToast(`User role locally changed to ${newRole}!`, "success");
        } else {
            this.showToast("User not found locally.", "error");
        }
        this.fetchAdminUsers(document.getElementById('admin-user-search')?.value || "");
    },

    renderAnnouncementsBanner() {
        const container = document.getElementById('announcements-banner-container');
        if (!container) return;

        const dismissals = JSON.parse(sessionStorage.getItem('cl_dismissed_announcements') || '[]');

        const renderAnns = (list) => {
            const localAnns = JSON.parse(localStorage.getItem('cl_announcements')) || [];
            const map = new Map();
            (list || []).concat(localAnns).forEach(item => {
                if (item && item.id && !map.has(String(item.id))) {
                    map.set(String(item.id), item);
                }
            });
            const combinedList = Array.from(map.values());

            const activeList = combinedList.filter(ann => {
                if (!ann || ann.id === 'mock-announcement-1' || ann.id === 'mock-announcement-2') return false;
                if (ann.is_active === false) return false;
                if (dismissals.includes(ann.id) || dismissals.includes(String(ann.id))) return false;
                if (ann.expires_at && new Date(ann.expires_at) < new Date()) return false;
                return true;
            });

            // Priority sorting: urgent > high > normal > low
            const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 };
            activeList.sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));

            if (activeList.length === 0) {
                container.style.display = 'none';
                container.innerHTML = '';
                return;
            }

            container.style.display = 'block';
            container.innerHTML = '';

            activeList.forEach(ann => {
                const card = document.createElement('div');
                card.className = `announcements-banner-card ${ann.priority || 'normal'}`;
                
                let iconName = 'info';
                if (ann.priority === 'urgent') iconName = 'alert-triangle';
                else if (ann.priority === 'high') iconName = 'megaphone';
                else if (ann.priority === 'low') iconName = 'bell-off';

                card.innerHTML = `
                    <i data-lucide="${iconName}" class="banner-icon" style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;"></i>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 14px; margin: 0; display: flex; align-items: center; gap: 8px;">
                            ${ann.title}
                            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; opacity: 0.6; font-family: 'JetBrains Mono', monospace;">Notice</span>
                        </h4>
                        <p style="font-size: 13px; margin: 6px 0 0 0; line-height: 1.4; opacity: 0.85;">${ann.body}</p>
                    </div>
                    <button onclick="app.dismissAnnouncement('${ann.id}')" style="background: none; border: none; cursor: pointer; color: inherit; padding: 4px; opacity: 0.6; align-self: flex-start; transition: opacity 0.15s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="Dismiss Notice">
                        <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                    </button>
                `;
                container.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('announcements').select('*').then(({ data, error }) => {
                renderAnns(data || []);
            }).catch(err => {
                console.error("Failed to load announcements for banner:", err);
                renderAnns([]);
            });
        } else {
            renderAnns([]);
        }
    },

    dismissAnnouncement(annId) {
        const dismissals = JSON.parse(sessionStorage.getItem('cl_dismissed_announcements') || '[]');
        dismissals.push(annId);
        sessionStorage.setItem('cl_dismissed_announcements', JSON.stringify(dismissals));
        this.renderAnnouncementsBanner();
    },

    renderEventsBanner() {
        const container = document.getElementById('events-banner-container');
        if (!container) return;

        const renderEvts = (list) => {
            const localEvents = JSON.parse(localStorage.getItem('cl_events')) || [];
            const map = new Map();
            (list || []).concat(localEvents).forEach(item => {
                if (item && item.id && !map.has(String(item.id))) {
                    map.set(String(item.id), item);
                }
            });
            const combinedList = Array.from(map.values());

            const upcomingList = combinedList.filter(evt => {
                if (!evt || evt.id === 'mock-event-1' || evt.id === 'mock-event-2') return false;
                if (!evt.date) return false;
                const eventDate = new Date(evt.date);
                eventDate.setHours(23, 59, 59, 999);
                return eventDate >= new Date();
            });

            // Sort by date ascending
            upcomingList.sort((a, b) => new Date(a.date) - new Date(b.date));

            if (upcomingList.length === 0) {
                container.style.display = 'none';
                container.innerHTML = '';
                return;
            }

            container.style.display = 'block';
            container.innerHTML = `
                <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; font-weight: 700; color: #f5c842; letter-spacing: 0.05em; text-transform: uppercase;">Upcoming Campus Events</span>
                    <div style="flex: 1; height: 1px; background: linear-gradient(90deg, #2a2a33, transparent);"></div>
                </div>
                <div class="events-banner-list"></div>
            `;

            const listWrapper = container.querySelector('.events-banner-list');

            upcomingList.forEach(evt => {
                const card = document.createElement('div');
                card.className = 'events-banner-card';

                const timeStr = evt.time ? evt.time.slice(0, 5) : 'All Day';
                const isFeaturedBadge = evt.is_featured ? `<span style="background: rgba(245, 200, 66, 0.15); color: #f5c842; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700;">FEATURED</span>` : '';
                const regLinkHtml = evt.registration_link 
                    ? `<a href="${evt.registration_link}" target="_blank" class="admin-btn admin-btn-primary" style="padding: 6px 12px; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-block;" onclick="event.stopPropagation();">Register Now</a>` 
                    : `<span style="font-size: 12px; color: #8b8b9a; font-weight: 500;">No link required</span>`;

                card.innerHTML = `
                    <div style="background: rgba(245, 200, 66, 0.08); width: 44px; height: 44px; border-radius: 8px; display: flex; flex-shrink: 0; align-items: center; justify-content: center; color: #f5c842;">
                        <i data-lucide="calendar-heart" style="width: 22px; height: 22px;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 13.5px; color: #f0f0f4; display: flex; align-items: center; gap: 8px;">
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${evt.title}</span>
                            ${isFeaturedBadge}
                        </div>
                        <div style="font-size: 11.5px; color: #8b8b9a; margin-top: 3px; display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center;">
                            <span style="font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="calendar" style="width: 12px; height: 12px;"></i> ${evt.date}
                            </span>
                            <span style="font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${timeStr}
                            </span>
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> ${evt.venue || 'TBD'}
                            </span>
                        </div>
                    </div>
                    <div style="flex-shrink: 0;">
                        ${regLinkHtml}
                    </div>
                `;
                listWrapper.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('events').select('*').then(({ data, error }) => {
                renderEvts(data || []);
            }).catch(err => {
                console.error("Failed to load events for banner:", err);
                renderEvts([]);
            });
        } else {
            renderEvts([]);
        }
    },

    // === NEW ADMIN DELETION ACTIONS ===
    renderAdminListings() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">Marketplace Listings</h1>
                    <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Inspect and delete student postings on the Marketplace.</p>
                </div>

                <div class="admin-table-container">
                    <div class="admin-table-row header" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 120px;">
                        <div>Title / Seller</div>
                        <div>Price</div>
                        <div>Category</div>
                        <div>Condition</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    <div id="admin-listings-list">
                        <div style="padding: 40px; text-align: center; color: #8b8b9a;">Loading listings...</div>
                    </div>
                </div>
            </div>
        `;

        this.fetchAdminListings();
    },

    fetchAdminListings() {
        const listEl = document.getElementById('admin-listings-list');
        if (!listEl) return;

        const renderListings = (list) => {
            if (list.length === 0) {
                listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #8b8b9a;">No marketplace items listed yet.</div>';
                return;
            }
            listEl.innerHTML = '';
            list.forEach(item => {
                const row = document.createElement('div');
                row.className = 'admin-table-row';
                row.style.gridTemplateColumns = '2fr 1.2fr 1fr 1fr 120px';

                row.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: #f0f0f4;">${item.title}</div>
                        <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px;">Seller: ${item.seller_name || item.sellerName || item.seller_email}</div>
                    </div>
                    <div style="font-family: 'JetBrains Mono', monospace; color: #f5c842; font-weight: 700;">₹${item.price}</div>
                    <div style="color: #f0f0f4;">${item.category}</div>
                    <div>
                        <span style="background: rgba(255,255,255,0.05); color: #f0f0f4; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">${item.condition}</span>
                    </div>
                    <div style="text-align: right;">
                        <button onclick="app.deleteAdminListing('${item.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Listing">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                `;
                listEl.appendChild(row);
            });
            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('listings').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
                if (error) throw error;
                renderListings(data || []);
            }).catch(err => {
                console.error("Failed to fetch listings from Supabase:", err);
                const local = JSON.parse(localStorage.getItem('cl_listings')) || [];
                renderListings(local);
            });
        } else {
            const local = JSON.parse(localStorage.getItem('cl_listings')) || [];
            renderListings(local);
        }
    },

    deleteAdminListing(id) {
        if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('listings').delete().eq('id', id).then(({ error }) => {
                if (error) throw error;
                this.showToast("Listing deleted successfully!", "info");
                this.fetchAdminListings();
            }).catch(err => {
                console.error("Failed to delete listing from Supabase:", err);
                this.deleteAdminListingLocally(id);
            });
        } else {
            this.deleteAdminListingLocally(id);
        }
    },

    deleteAdminListingLocally(id) {
        const local = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const updated = local.filter(item => item.id !== id && item.id != id);
        localStorage.setItem('cl_listings', JSON.stringify(updated));
        this.showToast("Listing deleted locally!", "info");
        this.fetchAdminListings();
    },

    renderAdminTeams() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">Project Teams</h1>
                    <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Inspect and delete study groups/hackathon teams posted on CollabBoard.</p>
                </div>

                <div class="admin-table-container">
                    <div class="admin-table-row header" style="grid-template-columns: 1.5fr 1.5fr 1.2fr 1fr 120px;">
                        <div>Project Title / Creator</div>
                        <div>Description</div>
                        <div>Skills Needed</div>
                        <div>Open Roles</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    <div id="admin-teams-list">
                        <div style="padding: 40px; text-align: center; color: #8b8b9a;">Loading teams...</div>
                    </div>
                </div>
            </div>
        `;

        this.fetchAdminTeams();
    },

    fetchAdminTeams() {
        const listEl = document.getElementById('admin-teams-list');
        if (!listEl) return;

        const renderTeams = (list) => {
            if (list.length === 0) {
                listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #8b8b9a;">No collab teams created yet.</div>';
                return;
            }
            listEl.innerHTML = '';
            list.forEach(team => {
                const row = document.createElement('div');
                row.className = 'admin-table-row';
                row.style.gridTemplateColumns = '1.5fr 1.5fr 1.2fr 1fr 120px';

                row.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: #f0f0f4;">${team.title}</div>
                        <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px;">By: ${team.creator_name || team.creatorName || team.creator_email}</div>
                    </div>
                    <div style="color: #8b8b9a; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${team.description}">${team.description}</div>
                    <div style="color: #f0f0f4; font-size: 13px;">${this.parseArrayField(team.skills).join(', ')}</div>
                    <div style="color: #f0f0f4; font-size: 13px;">${this.parseArrayField(team.open_roles || team.openRoles).join(', ')}</div>
                    <div style="text-align: right;">
                        <button onclick="app.deleteAdminTeam('${team.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Team">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                `;
                listEl.appendChild(row);
            });
            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('teams').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
                if (error) throw error;
                renderTeams(data || []);
            }).catch(err => {
                console.error("Failed to fetch teams from Supabase:", err);
                const local = JSON.parse(localStorage.getItem('cl_teams')) || [];
                renderTeams(local);
            });
        } else {
            const local = JSON.parse(localStorage.getItem('cl_teams')) || [];
            renderTeams(local);
        }
    },

    deleteAdminTeam(id) {
        if (!confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('teams').delete().eq('id', id).then(({ error }) => {
                if (error) throw error;
                this.showToast("Team deleted successfully!", "info");
                this.fetchAdminTeams();
            }).catch(err => {
                console.error("Failed to delete team from Supabase:", err);
                this.deleteAdminTeamLocally(id);
            });
        } else {
            this.deleteAdminTeamLocally(id);
        }
    },

    deleteAdminTeamLocally(id) {
        const local = JSON.parse(localStorage.getItem('cl_teams')) || [];
        const updated = local.filter(team => team.id !== id && team.id != id);
        localStorage.setItem('cl_teams', JSON.stringify(updated));
        this.showToast("Team deleted locally!", "info");
        this.fetchAdminTeams();
    },

    renderAdminForum() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.25s ease;">
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 26px; font-weight: 700; color: #f0f0f4; margin: 0;">Forum Threads</h1>
                    <p style="font-size: 14px; color: #8b8b9a; margin: 4px 0 0 0;">Inspect and delete student discussions/posts on the Forum.</p>
                </div>

                <div class="admin-table-container">
                    <div class="admin-table-row header" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 120px;">
                        <div>Title / Sub-Community</div>
                        <div>Author</div>
                        <div>Upvotes</div>
                        <div>Comments</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    <div id="admin-forum-list">
                        <div style="padding: 40px; text-align: center; color: #8b8b9a;">Loading forum posts...</div>
                    </div>
                </div>
            </div>
        `;

        this.fetchAdminForum();
    },

    fetchAdminForum() {
        const listEl = document.getElementById('admin-forum-list');
        if (!listEl) return;

        const renderPosts = (list) => {
            if (list.length === 0) {
                listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #8b8b9a;">No forum threads posted yet.</div>';
                return;
            }
            listEl.innerHTML = '';
            list.forEach(post => {
                const row = document.createElement('div');
                row.className = 'admin-table-row';
                row.style.gridTemplateColumns = '2fr 1.2fr 1fr 1fr 120px';

                const upvotesCount = post.upvotes ? (Array.isArray(post.upvotes) ? post.upvotes.length : 0) : 0;
                const commentsCount = post.comments_count || 0;

                row.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: #f0f0f4;">${post.title}</div>
                        <div style="font-size: 12px; color: #6C63FF; margin-top: 2px;">r/${post.subreddit}</div>
                    </div>
                    <div style="color: #f0f0f4; font-size: 13px;">${post.authorName || post.author_name || post.author_email || 'VVCE Student'}</div>
                    <div style="color: #f0f0f4; font-family: 'JetBrains Mono', monospace;">${upvotesCount}</div>
                    <div style="color: #f0f0f4; font-family: 'JetBrains Mono', monospace;">${commentsCount}</div>
                    <div style="text-align: right;">
                        <button onclick="app.deleteAdminForum('${post.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Post">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                `;
                listEl.appendChild(row);
            });
            if (window.lucide) lucide.createIcons();
        };

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('reddit_posts').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
                if (error) throw error;
                renderPosts(data || []);
            }).catch(err => {
                console.error("Failed to fetch forum posts from Supabase:", err);
                const local = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
                renderPosts(local);
            });
        } else {
            const local = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
            renderPosts(local);
        }
    },

    deleteAdminForum(id) {
        if (!confirm("Are you sure you want to delete this forum post? This action cannot be undone.")) return;

        if (this.isSupabaseEnabled()) {
            supabaseClient.from('reddit_posts').delete().eq('id', id).then(({ error }) => {
                if (error) throw error;
                this.showToast("Forum post deleted successfully!", "info");
                this.fetchAdminForum();
            }).catch(err => {
                console.error("Failed to delete forum post from Supabase:", err);
                this.deleteAdminForumLocally(id);
            });
        } else {
            this.deleteAdminForumLocally(id);
        }
    },

    deleteAdminForumLocally(id) {
        const local = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
        const updated = local.filter(post => post.id !== id && post.id != id);
        localStorage.setItem('cl_reddit_posts', JSON.stringify(updated));
        this.showToast("Forum post deleted locally!", "info");
        this.fetchAdminForum();
    },

};

// Make app instance globally accessible on window object
window.app = app;

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
