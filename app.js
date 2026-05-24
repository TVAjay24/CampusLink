/**
 * CampusLink - Main Application & Backend Controller
 * Simulates a robust university database using localStorage & sessionStorage.
 */

const app = {
    // Active navigation state
    currentView: 'home',
    currentUser: null,
    activeChatEmail: null,
    activeProfileTab: 'listings',
    
    // Reddit states
    activeSubreddit: 'all',
    activeRedditSort: 'hot',

    // Core Init
    init() {
        console.log("CampusLink Initializing...");
        
        // Seed mock database entries on first run
        this.seedMockDatabase();
        
        // Setup Form & Action Event Listeners
        this.setupEventListeners();
        
        // Check Session Gate
        this.checkAuthSession();
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
                }
                localStorage.setItem(key, JSON.stringify(defaultProfile));
            }
        });

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
    },

    // 2. SESSION & SECURITY GUARD
    checkAuthSession() {
        let storedUser = localStorage.getItem('cl_current_user');
        
        // Auto-login Suresh Gowda on first run for perfect image-matching display!
        if (!storedUser && !sessionStorage.getItem('cl_logged_out_once')) {
            const users = JSON.parse(localStorage.getItem('cl_users')) || [];
            const suresh = users.find(u => u.email === 'suresh@vvce.ac.in');
            if (suresh) {
                localStorage.setItem('cl_current_user', JSON.stringify(suresh));
                storedUser = JSON.stringify(suresh);
            }
        }

        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            
            // Show main layout & elements
            document.getElementById('auth-page').style.display = 'none';
            document.getElementById('main-navbar').style.display = 'block';
            document.getElementById('app-content').style.display = 'block';
            document.getElementById('main-footer').style.display = 'block';

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
        } else {
            // Locking Dashboard
            this.currentUser = null;
            document.getElementById('auth-page').style.display = 'flex';
            document.getElementById('main-navbar').style.display = 'none';
            document.getElementById('app-content').style.display = 'none';
            document.getElementById('main-footer').style.display = 'none';
            
            // Clear fields and toggle signin active tab
            this.switchAuthTab('signin');
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

        // Display view container
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;
            window.scrollTo(0, 0);

            // Special subview rendering
            if (viewId === 'browse') {
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

        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        this.renderListingsToContainer(listings, grid);
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

        const wishlist = JSON.parse(localStorage.getItem(`cl_wishlist_${this.currentUser.email}`)) || [];

        dataList.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card glass-panel';
            
            const conditionClass = product.condition === 'New' ? 'new' : 'used';
            const isLiked = wishlist.includes(product.id);
            const heartClass = isLiked ? 'active' : '';

            const isOwner = product.sellerEmail === this.currentUser.email;

            let cardActions = '';
            if (isOwner) {
                cardActions = `
                    <div class="product-owner-actions">
                        <button class="btn btn-secondary owner-btn" onclick="app.openEditListing(${product.id})">
                            <i data-lucide="edit" style="width: 14px; height: 14px;"></i> Edit
                        </button>
                        <button class="btn btn-secondary owner-btn delete" onclick="app.deleteListing(${product.id})">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete
                        </button>
                    </div>
                `;
            } else {
                cardActions = `
                    <div class="product-actions-btn-group" style="display: flex; gap: 0.5rem; width: 100%;">
                        <button class="btn btn-primary product-action-btn" onclick="app.buyContactItem(${product.id})" style="flex: 1;">
                            <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Buy / Contact
                        </button>
                        <button class="btn btn-secondary product-action-btn ai-chat-btn" onclick="app.chatWithAiAboutListing(${product.id})" style="padding: 0.5rem 0.85rem; border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.1); color: #818cf8; width: auto;" title="Chat with AI Assistant">
                            <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> Ask AI
                        </button>
                    </div>
                `;
            }

            const placeholderImg = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600";
            const productImg = product.image ? product.image : placeholderImg;

            card.innerHTML = `
                <button class="wishlist-btn ${heartClass}" onclick="app.toggleWishlist(${product.id}, event)">
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
                            <span>${product.sellerName}</span>
                        </div>
                        <span class="text-sm">${product.timestamp}</span>
                    </div>
                    ${cardActions}
                </div>
            `;
            containerNode.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    },

    filterListings() {
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
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
            const matchesSearch = item.title.toLowerCase().includes(searchVal) || 
                                  item.description.toLowerCase().includes(searchVal) ||
                                  item.category.toLowerCase().includes(searchVal);
            
            const matchesCategory = (categoryVal === 'all') || (item.category === categoryVal);
            
            const matchesPrice = (item.price >= minPrice) && (item.price <= maxPrice);
            
            const matchesCondition = (checkedConditions.length === 0) || checkedConditions.includes(item.condition);

            return matchesSearch && matchesCategory && matchesPrice && matchesCondition;
        });

        if (this.showWishlistOnly) {
            const wishlist = JSON.parse(localStorage.getItem(`cl_wishlist_${this.currentUser.email}`)) || [];
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
        
        // Re-render
        if (this.currentView === 'browse') {
            this.filterListings();
        } else if (this.currentView === 'profile') {
            this.renderProfile();
        }
    },

    deleteListing(productId) {
        if (confirm("Are you sure you want to delete this listing?")) {
            let listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
            listings = listings.filter(item => item.id !== productId);
            localStorage.setItem('cl_listings', JSON.stringify(listings));
            
            this.showToast("Item deleted successfully", "success");
            
            // Recompute Karma & Profile Grid
            if (this.currentView === 'browse') {
                this.renderProducts();
            } else if (this.currentView === 'profile') {
                this.renderProfile();
            }
        }
    },

    openEditListing(productId) {
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const item = listings.find(i => i.id === productId);
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
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const product = listings.find(p => p.id === productId);
        if (!product) return;

        const sellerEmail = product.sellerEmail;
        const sellerName = product.sellerName;
        
        if (sellerEmail === this.currentUser.email) {
            this.showToast("You cannot purchase your own item!", "error");
            return;
        }

        // Init message thread in user inbox
        const buyerInboxKey = `cl_messages_${this.currentUser.email}`;
        const sellerInboxKey = `cl_messages_${sellerEmail}`;

        let buyerInbox = JSON.parse(localStorage.getItem(buyerInboxKey)) || {};
        let sellerInbox = JSON.parse(localStorage.getItem(sellerInboxKey)) || {};

        if (!buyerInbox[sellerEmail]) buyerInbox[sellerEmail] = [];
        if (!sellerInbox[this.currentUser.email]) sellerInbox[this.currentUser.email] = [];

        // Check if there are messages. If empty, push introduction
        if (buyerInbox[sellerEmail].length === 0) {
            const introMsg = {
                sender: this.currentUser.email,
                text: `Hi! I am interested in your item: "${product.title}" (listed for ₹${product.price}). Is it still available?`,
                timestamp: "Just now",
                unread: true
            };
            buyerInbox[sellerEmail].push(introMsg);
            
            // Clone for seller inbox
            const sellerIntroMsg = { ...introMsg, unread: true };
            sellerInbox[this.currentUser.email].push(sellerIntroMsg);

            localStorage.setItem(buyerInboxKey, JSON.stringify(buyerInbox));
            localStorage.setItem(sellerInboxKey, JSON.stringify(sellerInbox));
        }

        this.showToast("Message sent to seller! Redirecting to chat...", "success");
        
        // Navigate to Chat thread
        this.activeChatEmail = sellerEmail;
        setTimeout(() => {
            this.navigate('chat');
        }, 500);
    },

    // 6. COLLABBOARD (TEAMS)
    renderTeams() {
        const grid = document.getElementById('collab-teams-grid');
        if (!grid) return;

        const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
        
        // Compute unique skills chips dynamically
        this.renderSkillFilterChips(teams);

        // Filter based on active skill filter chip
        const activeChip = document.querySelector('.skill-chip.active');
        const filterSkill = activeChip ? activeChip.getAttribute('data-skill') : 'all';

        let dataToRender = teams;
        if (filterSkill !== 'all') {
            dataToRender = teams.filter(t => {
                const skillsArr = t.skills.split(',').map(s => s.trim().toLowerCase());
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
            const skillsArr = team.skills.split(',').map(s => s.trim());
            let skillsBadges = skillsArr.map(s => `<span class="tag-badge skill">${s}</span>`).join('');

            // Open Roles tags
            const rolesArr = team.openRoles.split(',').map(r => r.trim());
            let rolesBadges = rolesArr.map(r => `<span class="tag-badge role">${r}</span>`).join('');

            const isOwner = team.createdByEmail === this.currentUser.email;
            const appliedList = team.applicants || [];
            const hasApplied = appliedList.some(app => app.email === this.currentUser.email);

            let actionBtn = '';
            if (isOwner) {
                const count = appliedList.length;
                const badgeStr = count > 0 ? ` <span class="badge-count" style="margin-left:5px;">${count}</span>` : '';
                actionBtn = `<button class="btn btn-primary" onclick="app.openManageApplicants(${team.id})" style="width:100%; margin-top: auto;">Manage${badgeStr}</button>`;
            } else if (hasApplied) {
                actionBtn = `<button class="btn btn-secondary" style="width:100%; margin-top: auto;" disabled>Application Sent</button>`;
            } else {
                actionBtn = `<button class="btn btn-primary" onclick="app.applyToTeam(${team.id})" style="width:100%; margin-top: auto;">Apply / Join</button>`;
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
            t.skills.split(',').forEach(s => {
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
        const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
        const team = teams.find(t => t.id === teamId);
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

        team.applicants.push({
            name: this.currentUser.name,
            email: this.currentUser.email,
            branch: this.currentUser.branch,
            semester: this.currentUser.semester,
            phone: this.currentUser.phone
        });

        localStorage.setItem('cl_teams', JSON.stringify(teams));
        this.showToast("Application sent to team leader!", "success");
        this.renderTeams();
    },

    openManageApplicants(teamId) {
        const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
        const team = teams.find(t => t.id === teamId);
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

    // 7. HACKATHONS PAGE
    renderHackathons() {
        const grid = document.getElementById('hackathons-grid');
        if (!grid) return;

        const hackathons = JSON.parse(localStorage.getItem('cl_hackathons')) || [];
        const registrations = JSON.parse(localStorage.getItem('cl_hackathon_registrations')) || [];

        // Update statistics
        document.getElementById('hack-stat-count').textContent = hackathons.filter(h => h.status !== 'ended').length;
        document.getElementById('hack-stat-registrations').textContent = registrations.length;
        
        let prizeSum = 0;
        hackathons.forEach(h => {
            const numericVal = parseInt(h.prizePool.replace(/[^0-9]/g, '')) || 0;
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
                actionBtn = `<button class="btn btn-primary" onclick="app.openRegisterHackathon(${hack.id})" style="width: 100%;">Register Team</button>`;
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
    },

    openRegisterHackathon(hackId) {
        const hackathons = JSON.parse(localStorage.getItem('cl_hackathons')) || [];
        const hack = hackathons.find(h => h.id === hackId);
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

        const posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];

        // Upgrades sidebar active classes
        document.querySelectorAll('.subreddit-item').forEach(el => {
            el.classList.remove('active');
            const sub = el.getAttribute('onclick').match(/'([^']+)'/)[1];
            if (sub === this.activeSubreddit) el.classList.add('active');
        });

        // Filter subreddit & search
        const searchInput = document.getElementById('reddit-search-input');
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (searchInput) {
            searchInput.placeholder = this.activeSubreddit === 'all' ? "Search threads in r/all..." : `Search threads in r/${this.activeSubreddit}...`;
        }

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
                <button class="reddit-action-btn delete-btn" onclick="app.deleteRedditPost(${post.id})">
                    <i data-lucide="trash-2" style="width: 12px; height:12px;"></i> Delete
                </button>
            ` : '';

            const commentsList = JSON.parse(localStorage.getItem(`cl_reddit_comments_${post.id}`)) || [];
            const commentCount = commentsList.length;

            card.innerHTML = `
                <div class="reddit-upvote-panel">
                    <button class="vote-arrow up ${upClass}" onclick="app.voteRedditPost(${post.id}, 1)">
                        <i data-lucide="arrow-up" style="width: 20px; height: 20px;"></i>
                    </button>
                    <span class="vote-count" style="font-size:0.85rem;">${score}</span>
                    <button class="vote-arrow down ${downClass}" onclick="app.voteRedditPost(${post.id}, -1)">
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
                        <button class="reddit-action-btn" onclick="app.toggleRedditComments(${post.id})">
                            <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
                            <span>${commentCount} Comment${commentCount === 1 ? '' : 's'}</span>
                        </button>
                        ${deleteBtn}
                    </div>

                    <!-- Threaded comments drawer -->
                    <div class="post-comments-drawer" id="reddit-comments-drawer-${post.id}">
                        <form class="comment-input-area" onsubmit="app.submitRedditComment(${post.id}, event)" style="margin-top: 1rem;">
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
        let posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
        const post = posts.find(p => p.id === postId);
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

        const comments = JSON.parse(localStorage.getItem(`cl_reddit_comments_${postId}`)) || [];
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
                    <span>${comment.timestamp}</span>
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
        const idx = posts.findIndex(p => p.id === postId);
        if (idx > -1) {
            posts[idx].commentsCount = (posts[idx].commentsCount || 0) + 1;
            localStorage.setItem('cl_reddit_posts', JSON.stringify(posts));
        }

        input.value = '';
        this.showToast("Comment published!", "success");
        
        this.renderRedditCommentsList(postId);
        this.renderRedditPosts();
    },

    deleteRedditPost(postId) {
        if (confirm("Are you sure you want to delete this community thread?")) {
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
    },

    // 9. PROFILE PAGE & KARMA CALCULATOR
    renderProfile() {
        // Personal info
        document.getElementById('profile-avatar-large').textContent = this.currentUser.name[0].toUpperCase();
        document.getElementById('profile-full-name').textContent = this.currentUser.name;
        document.getElementById('profile-branch-sem').textContent = `${this.currentUser.branch} | Semester ${this.currentUser.semester}`;

        // Bio, Skills, Links from Profile Store
        const profileKey = `cl_profile_${this.currentUser.email}`;
        const profile = JSON.parse(localStorage.getItem(profileKey)) || { bio: "", skills: [], github: "", linkedin: "" };

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
        if (profile.skills && profile.skills.length > 0) {
            profile.skills.forEach(skill => {
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
        // formula: posts made × 5 + upvotes received × 2 + items listed × 10
        const redditPosts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];
        const myRedditPosts = redditPosts.filter(p => p.authorEmail === this.currentUser.email);
        const myPostsCount = myRedditPosts.length;

        // Sum upvotes on my posts
        let receivedUpvotesCount = 0;
        myRedditPosts.forEach(p => {
            if (p.upvotes) receivedUpvotesCount += p.upvotes.length;
        });

        // Items sold/listed
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const myItems = listings.filter(item => item.sellerEmail === this.currentUser.email);
        const myItemsCount = myItems.length;

        const karmaScore = (myPostsCount * 5) + (receivedUpvotesCount * 2) + (myItemsCount * 10);
        document.getElementById('profile-karma-value').textContent = karmaScore;

        // Renders Activity Lists
        this.renderProfileActivityTabs(myItems, myRedditPosts);
    },

    renderProfileActivityTabs(myItems, myRedditPosts) {
        // Tab 1: Listings
        const listingsGrid = document.getElementById('profile-listings-grid');
        this.renderListingsToContainer(myItems, listingsGrid, true);

        // Tab 2: Teams
        const teamsGrid = document.getElementById('profile-teams-grid');
        teamsGrid.innerHTML = '';
        const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];
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
                            <button class="btn btn-primary" onclick="app.openManageApplicants(${team.id})" style="width:100%; font-size:0.8rem; padding: 0.4rem;">Manage Applicants (${appCount})</button>
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
                        <button class="reddit-action-btn delete-btn" onclick="app.deleteRedditPost(${post.id})" style="font-size:0.75rem;"><i data-lucide="trash-2" style="width:12px; height:12px;"></i> Delete</button>
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

        const inboxKey = `cl_messages_${this.currentUser.email}`;
        const inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
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
        const users = JSON.parse(localStorage.getItem('cl_users')) || [];
        const isAi = this.activeChatEmail === "campuslink_ai";
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

        // Mark messages as read
        const inboxKey = `cl_messages_${this.currentUser.email}`;
        let inbox = JSON.parse(localStorage.getItem(inboxKey)) || {};
        if (inbox[this.activeChatEmail]) {
            inbox[this.activeChatEmail].forEach(m => {
                if (m.sender === this.activeChatEmail) m.unread = false;
            });
            localStorage.setItem(inboxKey, JSON.stringify(inbox));
        }

        // Render Bubbles
        const viewport = document.getElementById('chat-messages-viewport');
        viewport.innerHTML = '';

        const messages = inbox[this.activeChatEmail] || [];
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            const isMe = msg.sender === this.currentUser.email;
            bubble.className = `chat-bubble ${isMe ? 'sent' : 'received'}`;
            
            bubble.innerHTML = `
                <div>${msg.text}</div>
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

    selectChatThread(email) {
        this.activeChatEmail = email;
        this.renderChatPane();
        this.toggleChatSidebar(false); // Hide sidebar in mobile
    },

    toggleChatSidebar(show) {
        const sidebar = document.getElementById('chat-sidebar');
        const pane = document.getElementById('chat-pane');
        const backBtn = document.getElementById('chat-back-btn');

        if (!sidebar || !pane) return;

        if (window.innerWidth <= 768) {
            if (show) {
                sidebar.classList.remove('inactive');
                pane.classList.remove('active');
                if (backBtn) backBtn.style.display = 'none';
            } else {
                sidebar.classList.add('inactive');
                pane.classList.add('active');
                if (backBtn) backBtn.style.display = 'inline-flex';
            }
        } else {
            sidebar.classList.remove('inactive');
            pane.classList.add('active');
            if (backBtn) backBtn.style.display = 'none';
        }
    },

    updateUnreadCountBadge() {
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
    },

    // 11. SETUP EVENTS & LISTENERS
    setupEventListeners() {
        // Close dropdowns on window clicks
        window.addEventListener('click', () => {
            this.closeAllDropdowns();
        });

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

                // Loading visual
                btn.classList.add('loading');
                btn.disabled = true;

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
                        btn.classList.remove('loading');
                        btn.disabled = false;
                    }
                }, 1200);
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

                btn.classList.add('loading');
                btn.disabled = true;

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
                }, 1200);
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

                setTimeout(() => {
                    this.showToast("Reset password instructions sent to your VVCE email!", "success");
                    btn.classList.remove('loading');
                    btn.disabled = false;
                    this.closeModal('forgot-password-modal');
                    forgotForm.reset();
                }, 1200);
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

                let dummyImages = [
                    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
                    "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600",
                    "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600"
                ];
                let chosenImage = dummyImages[Math.floor(Math.random() * dummyImages.length)];

                const newListing = {
                    id: Date.now(),
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

                listings.unshift(newListing);
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

                let listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
                const idx = listings.findIndex(item => item.id === id);

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

                const teams = JSON.parse(localStorage.getItem('cl_teams')) || [];

                const newTeam = {
                    id: Date.now(),
                    teamName,
                    description,
                    skills,
                    openRoles,
                    createdBy: this.currentUser.name,
                    createdByEmail: this.currentUser.email,
                    applicants: []
                };

                teams.push(newTeam);
                localStorage.setItem('cl_teams', JSON.stringify(teams));

                this.showToast("Your project team recruitment is active!", "success");
                this.closeModal('create-team-modal');
                createTeamForm.reset();
                
                if (this.currentView === 'collab') {
                    this.renderTeams();
                } else if (this.currentView === 'profile') {
                    this.renderProfile();
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

                let posts = JSON.parse(localStorage.getItem('cl_reddit_posts')) || [];

                const newPost = {
                    id: Date.now(),
                    subreddit,
                    title,
                    flair,
                    body,
                    authorName: this.currentUser.name,
                    authorEmail: this.currentUser.email,
                    timestamp: "Just now",
                    upvotes: [this.currentUser.email], // self upvote
                    downvotes: [],
                    commentsCount: 0
                };

                posts.unshift(newPost);
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
                    timestamp: "Just now",
                    unread: false
                };

                const isAi = this.activeChatEmail === "campuslink_ai";

                if (isAi) {
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

                } else {
                    // Standard message to real student
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

                const profileKey = `cl_profile_${this.currentUser.email}`;
                const updatedProfile = { bio, skills, github, linkedin };

                localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
                this.showToast("Your profile dashboard has been updated!", "success");
                this.closeModal('edit-profile-modal');
                
                this.renderProfile();
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
                const profileKey = `cl_profile_${this.currentUser.email}`;
                const profile = JSON.parse(localStorage.getItem(profileKey)) || { bio: "", skills: [], github: "", linkedin: "" };

                document.getElementById('edit-bio').value = profile.bio || "";
                document.getElementById('edit-skills').value = (profile.skills || []).join(', ');
                document.getElementById('edit-github').value = profile.github || "";
                document.getElementById('edit-linkedin').value = profile.linkedin || "";
            }
            origOpenModal.call(this, modalId);
        };
    },

    toggleMobileMenu() {
        const nav = document.getElementById('main-nav-links');
        nav.classList.toggle('mobile-active');
    },

    logout() {
        sessionStorage.setItem('cl_logged_out_once', 'true');
        localStorage.removeItem('cl_current_user');
        this.currentUser = null;
        this.activeChatEmail = null;
        this.currentView = 'home';
        this.showToast("Logged out successfully!", "info");
        this.checkAuthSession();
    },

    /* ==========================================================================
       CampusLink Image-matching & AI Assistant Integrations
       ========================================================================== */

    chatWithAiAboutListing(productId) {
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const item = listings.find(i => i.id === productId);
        if (!item) return;

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
        const listings = JSON.parse(localStorage.getItem('cl_listings')) || [];
        const activeItemId = sessionStorage.getItem('cl_active_ai_item_id');
        const item = listings.find(i => i.id == activeItemId) || listings[0];
        
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
    } ,

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
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
