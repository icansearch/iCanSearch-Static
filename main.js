document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const domainSearch = document.getElementById('domain-search');
    const searchButton = document.getElementById('search-button');
    const availabilityIndicator = document.getElementById('availability-indicator');
    const availableBadge = document.getElementById('available-badge');
    const unavailableBadge = document.getElementById('unavailable-badge');
    const resultsSection = document.getElementById('results-section');
    const searchTermSpan = document.getElementById('search-term');
    const domainsContainer = document.getElementById('domains-container');
    
    // Cache for domain availability results
    const availabilityCache = {};
    const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // RapidAPI configuration for Domainr
    const RAPIDAPI_KEY = 'ba79451516mshb871d56bed355dep1ef136jsnda991528e579'; // Your RapidAPI key
    const RAPIDAPI_HOST = 'domainr.p.rapidapi.com';
    
    // Custom TLD list
    const tlds = ['.in', '.co.in', '.net', '.io', '.ai', '.org', '.info', '.store', '.org.in', '.live'];
    
    // Mock registrars data - in a real implementation, this would come from an API
    const registrars = [
        { name: 'NameCheap', logo: 'namecheap.png', rating: 4.7, features: ['Free WHOIS Privacy', 'Free DNS', 'Email Forwarding'] },
        { name: 'GoDaddy', logo: 'godaddy.png', rating: 4.2, features: ['24/7 Support', 'Domain Forwarding', 'Domain Lock'] },
        { name: 'Google Domains', logo: 'google.png', rating: 4.8, features: ['Free WHOIS Privacy', 'Free DNS', 'Email Forwarding'] },
        { name: 'Bluehost', logo: 'bluehost.png', rating: 4.5, features: ['Free SSL', 'Domain Lock', 'Auto Renewal'] },
        { name: 'HostGator', logo: 'hostgator.png', rating: 4.3, features: ['Free DNS', 'Domain Forwarding', 'Email Forwarding'] },
        { name: 'DreamHost', logo: 'dreamhost.png', rating: 4.6, features: ['Free WHOIS Privacy', 'Free SSL', 'Domain Lock'] },
        { name: 'Hostinger', logo: 'hostinger.png', rating: 4.4, features: ['Domain Forwarding', 'Email Forwarding', 'Domain Lock'] },
        { name: 'SiteGround', logo: 'siteground.png', rating: 4.7, features: ['Free SSL', 'Domain Lock', 'Auto Renewal'] }
    ];
    
    // Set price ranges by TLD
    const tldPriceRanges = {
        '.in': { min: 5.99, max: 9.99 },
        '.co.in': { min: 7.99, max: 12.99 },
        '.net': { min: 9.99, max: 14.99 },
        '.io': { min: 29.99, max: 49.99 },
        '.ai': { min: 59.99, max: 89.99 },
        '.org': { min: 8.99, max: 13.99 },
        '.info': { min: 4.99, max: 8.99 },
        '.store': { min: 7.99, max: 14.99 },
        '.org.in': { min: 6.99, max: 10.99 },
        '.live': { min: 9.99, max: 18.99 },
        '.com': { min: 8.99, max: 14.99 } // Default
    };
    
    // Typing timer for real-time availability check
    let typingTimer;
    const doneTypingInterval = 1000; // Increased from 500ms to 1000ms to reduce API calls
    
    // Event listeners
    domainSearch.addEventListener('keyup', function() {
        clearTimeout(typingTimer);
        if (domainSearch.value) {
            typingTimer = setTimeout(checkAvailabilityWhileTyping, doneTypingInterval);
        } else {
            availabilityIndicator.classList.add('hidden');
        }
    });
    
    searchButton.addEventListener('click', function() {
        if (domainSearch.value.trim() !== '') {
            performSearch(domainSearch.value.trim());
        }
    });
    
    domainSearch.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && domainSearch.value.trim() !== '') {
            performSearch(domainSearch.value.trim());
        }
    });
    
    // Make the Start Searching button work
    document.querySelector('.bg-white.text-blue-600').addEventListener('click', function() {
        window.scrollTo({
            top: document.querySelector('.search-container').offsetTop,
            behavior: 'smooth'
        });
        domainSearch.focus();
    });
    
    // Make the TLD pills clickable
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', function() {
            const tld = this.textContent;
            if (domainSearch.value) {
                let baseDomain = domainSearch.value.trim();
                if (baseDomain.includes('.')) {
                    baseDomain = baseDomain.split('.')[0];
                }
                performSearch(baseDomain + tld);
            }
        });
    });
    
    // Check domain availability while typing (single domain status check)
    async function checkAvailabilityWhileTyping() {
        const domain = domainSearch.value.trim();
        if (domain === '') return;
        
        // Show loading indicator
        availabilityIndicator.classList.remove('hidden');
        availableBadge.classList.add('hidden');
        unavailableBadge.classList.add('hidden');
        
        try {
            // Use Domainr API for the status check
            let domainToCheck = domain;
            if (!domainToCheck.includes('.')) {
                domainToCheck = domainToCheck + '.com'; // Add default TLD if none provided
            }
            
            const isAvailable = await checkDomainStatus(domainToCheck);
            
            if (isAvailable) {
                availableBadge.classList.remove('hidden');
                unavailableBadge.classList.add('hidden');
            } else {
                availableBadge.classList.add('hidden');
                unavailableBadge.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error checking domain availability:', error);
            // On error, hide availability indicator
            availabilityIndicator.classList.add('hidden');
        }
    }
    
    // Check domain status using Domainr via RapidAPI
    async function checkDomainStatus(domain) {
        // Normalize domain to lowercase for consistent cache keys
        const normalizedDomain = domain.toLowerCase();
        
        // Check if we have a non-expired cache entry
        if (availabilityCache[normalizedDomain] && 
            (Date.now() - availabilityCache[normalizedDomain].timestamp) < CACHE_EXPIRY) {
            console.log(`Using cached result for ${normalizedDomain}`);
            return availabilityCache[normalizedDomain].available;
        }
        
        try {
            const response = await fetch(`https://${RAPIDAPI_HOST}/v2/status?domain=${normalizedDomain}`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': RAPIDAPI_HOST
                }
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status && data.status.length > 0) {
                // Check the status of the domain
                // Possible status values: available, inactive, active, unavailable, parked, etc.
                const isAvailable = data.status[0].status === 'available' || data.status[0].status === 'inactive';
                
                // Save result in cache
                availabilityCache[normalizedDomain] = {
                    available: isAvailable,
                    timestamp: Date.now()
                };
                
                return isAvailable;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking domain status with Domainr:', error);
            // Fallback to a simulated check (for demo/development purposes)
            return Math.random() > 0.5;
        }
    }
    
    // Check domain availability using Cloudflare DNS API (free)
    async function checkDomainAvailabilityCloudflare(domain) {
        // Normalize domain to lowercase for consistent cache keys
        const normalizedDomain = domain.toLowerCase();
        
        // Check if we have a non-expired cache entry
        if (availabilityCache[normalizedDomain] && 
            (Date.now() - availabilityCache[normalizedDomain].timestamp) < CACHE_EXPIRY) {
            console.log(`Using cached result for ${normalizedDomain}`);
            return availabilityCache[normalizedDomain].available;
        }
        
        try {
            // Use DNS lookup to check if the domain exists
            const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${normalizedDomain}&type=A`, {
                headers: {
                    'Accept': 'application/dns-json'
                }
            });
            
            const data = await response.json();
            
            // If there's no answer or NXDOMAIN status, domain might be available
            const isAvailable = data.Status === 3 || !data.Answer || data.Answer.length === 0;
            
            // Save result in cache
            availabilityCache[normalizedDomain] = {
                available: isAvailable,
                timestamp: Date.now()
            };
            
            return isAvailable;
        } catch (error) {
            console.error('Error checking domain availability with Cloudflare:', error);
            // In case of error, use a fallback method
            return Math.random() > 0.5; // Random availability for failover
        }
    }
    
    // Perform search for domain and alternatives
    async function performSearch(searchTerm) {
        // Clear previous results
        domainsContainer.innerHTML = '';
        
        // Show loading indicators
        for (let i = 0; i < 5; i++) {
            const loadingCard = document.createElement('div');
            loadingCard.className = 'bg-white rounded-2xl shadow-sm p-6 domain-card';
            loadingCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="placeholder h-6 w-32 rounded"></div>
                    <div class="placeholder h-6 w-20 rounded"></div>
                </div>
                <div class="mt-3">
                    <div class="placeholder h-4 w-full rounded mt-2"></div>
                    <div class="placeholder h-4 w-3/4 rounded mt-2"></div>
                </div>
                <div class="mt-4 flex justify-between items-center">
                    <div class="placeholder h-5 w-16 rounded"></div>
                    <div class="placeholder h-10 w-32 rounded-full"></div>
                </div>
            `;
            domainsContainer.appendChild(loadingCard);
        }
        
        // Show results section and scroll to it
        resultsSection.classList.remove('hidden');
        searchTermSpan.textContent = searchTerm;
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Parse the search term
        let baseDomain = searchTerm;
        let providedTld = '.com'; // Default
        let userProvidedFullDomain = false;
        
        if (baseDomain.includes('.')) {
            const parts = baseDomain.split('.');
            providedTld = '.' + parts.slice(1).join('.');
            baseDomain = parts[0];
            userProvidedFullDomain = true;
        }
        
        // Define the main domain
        const mainDomain = userProvidedFullDomain ? 
            searchTerm : baseDomain + providedTld;
        
        // Check main domain with Domainr (accurate API)
        const mainDomainAvailable = await checkDomainStatus(mainDomain);
        
        // Clear loading indicators
        domainsContainer.innerHTML = '';
        
        // Create different layouts based on whether user provided a TLD
        if (userProvidedFullDomain) {
            // User searched with a specific TLD - flat layout with all results together
            // First add the searched domain at the top
            const searchHeader = document.createElement('div');
            searchHeader.className = 'my-2';
            domainsContainer.appendChild(searchHeader);
            
            // Add the main domain with a distinctive style
            addDomainCard(mainDomain, mainDomainAvailable, true, "searched");
            
            // Add a header for alternatives
            const alternativesHeader = document.createElement('div');
            alternativesHeader.className = 'mb-4 mt-8';
            alternativesHeader.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-700">Alternative Extensions</h3>
                <div class="h-0.5 bg-gray-200 mt-2"></div>
            `;
            domainsContainer.appendChild(alternativesHeader);
        } else {
            // User searched without a TLD - we show "Your Search" section prominently
            const yourSearchHeader = document.createElement('div');
            yourSearchHeader.className = 'mb-4 mt-2';
            yourSearchHeader.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-700">Your Search</h3>
                <div class="h-0.5 bg-gray-200 mt-2"></div>
            `;
            domainsContainer.appendChild(yourSearchHeader);
            
            // Add the main domain in a distinctive card
            addDomainCard(mainDomain, mainDomainAvailable, true, "primary");
            
            // Add a header for alternatives
            const alternativesHeader = document.createElement('div');
            alternativesHeader.className = 'mb-4 mt-8';
            alternativesHeader.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-700">Alternative Extensions</h3>
                <div class="h-0.5 bg-gray-200 mt-2"></div>
            `;
            domainsContainer.appendChild(alternativesHeader);
        }
        
        // Check alternative domains with Cloudflare (free)
        const alternativeTLDs = tlds.filter(tld => 
            tld.toLowerCase() !== providedTld.toLowerCase());
        
        // Keep track of available alternatives
        let availableCount = 0;
        
        // Process alternatives in parallel
        const alternativeChecks = alternativeTLDs.map(async (tld) => {
            const domain = baseDomain + tld;
            const isAvailable = await checkDomainAvailabilityCloudflare(domain);
            
            if (isAvailable) {
                availableCount++;
                addDomainCard(domain, true, false, "alternative");
            }
            
            return isAvailable ? domain : null;
        });
        
        // Wait for all checks to complete
        await Promise.all(alternativeChecks);
        
        // Update result count
        const totalAvailable = availableCount + (mainDomainAvailable ? 1 : 0);
        document.getElementById('results-count').textContent = 
            `Showing ${totalAvailable} available domain${totalAvailable !== 1 ? 's' : ''} for "${searchTerm}"`;
        
        // Add click handlers to view buttons
        document.querySelectorAll('.view-domain-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const domainName = this.getAttribute('data-domain');
                showRegistrarModal(domainName);
            });
        });
    }
    
    // Add a domain card to the results
    function addDomainCard(domain, isAvailable, isMain, cardType = "alternative") {
        const domainParts = domain.split('.');
        const name = domainParts[0];
        const extension = '.' + domainParts.slice(1).join('.');
        
        // Get starting price for this TLD from our ranges
        const priceRange = tldPriceRanges[extension.toLowerCase()] || tldPriceRanges['.com'];
        const startingPrice = (Math.random() * (priceRange.max - priceRange.min) + priceRange.min).toFixed(2);
        
        const card = document.createElement('div');
        
        // Set different styles based on card type
        if (cardType === "primary") {
            // The user's primary search when they search without a TLD
            card.className = 'bg-white rounded-2xl shadow-sm p-6 domain-card border-2 border-blue-500 relative mb-4';
        } else if (cardType === "searched") {
            // The exact domain the user searched for when including a TLD
            card.className = 'bg-white rounded-2xl shadow-sm p-6 domain-card border-2 border-blue-500 relative mb-4';
            // Add a "Your Search" badge
            const badge = document.createElement('div');
            badge.className = 'absolute -top-3 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded-full';
            badge.textContent = 'Your Search';
            card.appendChild(badge);
        } else {
            // Alternative domains
            card.className = 'bg-white rounded-2xl shadow-sm p-6 domain-card';
        }
        
        let badgeHtml = '';
        if (cardType === "primary") {
            badgeHtml = '<span class="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">Recommended</span>';
        }
        
        let availabilityHtml = '';
        if (isAvailable) {
            let buttonColor = cardType === "primary" || cardType === "searched" ? "btn-primary" : "bg-blue-500 hover:bg-blue-600";
            availabilityHtml = `
                <span class="text-green-600 flex items-center">
                    <i class="fas fa-check-circle mr-1"></i> Available
                </span>
                <button class="${buttonColor} text-white px-6 py-2 rounded-full font-medium transition view-domain-btn" data-domain="${domain}">
                    View Registrars
                </button>
            `;
        } else {
            availabilityHtml = `
                <span class="text-red-600 flex items-center">
                    <i class="fas fa-times-circle mr-1"></i> Unavailable
                </span>
                <button class="bg-gray-300 text-gray-600 px-6 py-2 rounded-full font-medium cursor-not-allowed" disabled>
                    Not Available
                </button>
            `;
        }
        
        card.innerHTML += `
            <div class="flex justify-between items-center">
                <h4 class="text-xl font-semibold text-gray-800">
                    <span class="text-gray-800">${name}</span>
                    <span class="text-blue-500">${extension}</span>
                </h4>
                ${badgeHtml}
            </div>
            <p class="text-gray-600 text-sm mt-2">Starting from <span class="text-green-600 font-semibold">$${startingPrice}</span> / year</p>
            <div class="mt-6 flex justify-between items-center">
                ${availabilityHtml}
            </div>
        `;
        
        domainsContainer.appendChild(card);
    }
    
    // Redirect to registrar comparison page instead of showing modal
    function showRegistrarModal(domain) {
        // Redirect to the comparison page with the domain as a URL parameter
        window.location.href = `registrar-comparison.html?domain=${encodeURIComponent(domain)}`;
    }
    
    // Generate star rating HTML
    function generateStarRating(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }
    
    // Update the TLD pills to match our custom list
    const pillsContainer = document.querySelector('.pills-container');
    pillsContainer.innerHTML = '';
    
    // Add the custom TLDs as pills
    tlds.forEach(tld => {
        const pill = document.createElement('span');
        pill.className = 'pill bg-white bg-opacity-20 text-white';
        pill.textContent = tld;
        pill.addEventListener('click', function() {
            if (domainSearch.value) {
                let baseDomain = domainSearch.value.trim();
                if (baseDomain.includes('.')) {
                    baseDomain = baseDomain.split('.')[0];
                }
                performSearch(baseDomain + tld);
            }
        });
        pillsContainer.appendChild(pill);
    });
});