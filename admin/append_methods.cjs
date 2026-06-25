const fs = require('fs');

const appPath = 'c:\\Users\\AJAY\\Downloads\\2ND SEMESTER\\project1\\campuslink\\IDT1\\IDT\\app.js';
const appContent = fs.readFileSync(appPath, 'utf8');

const newMethods = `
    // === NEW ADMIN DELETION ACTIONS ===
    renderAdminListings() {
        const container = document.getElementById('admin-main-content');
        if (!container) return;

        container.innerHTML = \`
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
        \`;

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

                row.innerHTML = \`
                    <div>
                        <div style="font-weight: 600; color: #f0f0f4;">\${item.title}</div>
                        <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px;">Seller: \${item.seller_name || item.sellerName || item.seller_email}</div>
                    </div>
                    <div style="font-family: 'JetBrains Mono', monospace; color: #f5c842; font-weight: 700;">₹\${item.price}</div>
                    <div style="color: #f0f0f4;">\${item.category}</div>
                    <div>
                        <span style="background: rgba(255,255,255,0.05); color: #f0f0f4; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">\${item.condition}</span>
                    </div>
                    <div style="text-align: right;">
                        <button onclick="app.deleteAdminListing('\${item.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Listing">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                \`;
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

        container.innerHTML = \`
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
        \`;

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

                row.innerHTML = \`
                    <div>
                        <div style="font-weight: 600; color: #f0f0f4;">\${team.title}</div>
                        <div style="font-size: 12px; color: #8b8b9a; margin-top: 2px;">By: \${team.creator_name || team.creatorName || team.creator_email}</div>
                    </div>
                    <div style="color: #8b8b9a; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="\${team.description}">\${team.description}</div>
                    <div style="color: #f0f0f4; font-size: 13px;">\${(team.skills || []).join(', ')}</div>
                    <div style="color: #f0f0f4; font-size: 13px;">\${(team.open_roles || team.openRoles || []).join(', ')}</div>
                    <div style="text-align: right;">
                        <button onclick="app.deleteAdminTeam('\${team.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Team">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                \`;
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

        container.innerHTML = \`
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
        \`;

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

                row.innerHTML = \`
                    <div>
                        <div style="font-weight: 600; color: #f0f0f4;">\${post.title}</div>
                        <div style="font-size: 12px; color: #6C63FF; margin-top: 2px;">r/\${post.subreddit}</div>
                    </div>
                    <div style="color: #f0f0f4; font-size: 13px;">\${post.authorName || post.author_name || post.author_email || 'VVCE Student'}</div>
                    <div style="color: #f0f0f4; font-family: 'JetBrains Mono', monospace;">\${upvotesCount}</div>
                    <div style="color: #f0f0f4; font-family: 'JetBrains Mono', monospace;">\${commentsCount}</div>
                    <div style="text-align: right;">
                        <button onclick="app.deleteAdminForum('\${post.id}')" style="background: none; border: none; cursor: pointer; color: #8b8b9a; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#8b8b9a'" title="Delete Post">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                \`;
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
`;

// Find the last index of }; in the file
const lastBraceIdx = appContent.lastIndexOf('};');

if (lastBraceIdx === -1) {
    console.error('Could not find the closing }; of the app object');
    process.exit(1);
}

// Check what line endings are used
const newline = appContent.includes('\r\n') ? '\r\n' : '\n';

const before = appContent.substring(0, lastBraceIdx);
const after = appContent.substring(lastBraceIdx);

const merged = before.trimRight() + ',' + newline + newMethods + newline + after;

fs.writeFileSync(appPath, merged, 'utf8');
console.log('Successfully appended admin deletion actions!');
