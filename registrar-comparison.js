document.addEventListener('DOMContentLoaded', function() {
    // Get domain name from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const domainName = urlParams.get('domain');
    
    // Update the domain name display
    const domainNameElement = document.getElementById('domain-name');
    if (domainName) {
        domainNameElement.textContent = domainName;
        document.title = `Compare Registrars for ${domainName} - iCanSearch`;
    }
    
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
    
    const registrarList = document.getElementById('registrar-list');
    const sortSelect = document.getElementById('sort-registrars');
    const filterSelect = document.getElementById('filter-feature');
    
    // Function to render the registrar list
    function renderRegistrarList(registrarData) {
        registrarList.innerHTML = '';
        
        if (registrarData.length === 0) {
            registrarList.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    No registrars match your criteria. Try adjusting your filters.
                </div>
            `;
            return;
        }
        
        // Add each registrar to the list
        registrarData.forEach((registrar, index) => {
            const row = document.createElement('div');
            row.className = 'p-6 hover:bg-gray-50 transition';
            
            // Format features
            const featuresHtml = registrar.features.map(feature => 
                `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mr-1 mb-1">${feature}</span>`
            ).join('');
            
            row.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex items-center">
                        <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-server text-gray-500 text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-xl text-gray-800">${registrar.name}</h3>
                            <div class="flex items-center text-sm mt-1">
                                <div class="flex items-center text-yellow-400 mr-1">
                                    ${generateStarRating(registrar.rating)}
                                </div>
                                <span class="text-gray-600">${registrar.rating}/5</span>
                            </div>
                            <div class="flex flex-wrap mt-2">
                                ${featuresHtml}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center md:self-center w-full md:w-auto">
                        <a href="https://${registrar.name.toLowerCase().replace(' ', '')}.com/domains/search?domain=${domainName}" 
                           target="_blank" 
                           class="btn-success text-white px-6 py-3 rounded-full font-medium transition w-full md:w-auto text-center">
                            <i class="fas fa-external-link-alt mr-2"></i> Visit ${registrar.name}
                        </a>
                    </div>
                </div>
            `;
            
            registrarList.appendChild(row);
        });
    }
    
    // Function to sort and filter registrars
    function updateRegistrarList() {
        let filteredRegistrars = [...registrars];
        
        // Apply feature filter
        const selectedFeature = filterSelect.value;
        if (selectedFeature) {
            filteredRegistrars = filteredRegistrars.filter(registrar => 
                registrar.features.includes(selectedFeature)
            );
        }
        
        // Apply sorting
        switch (sortSelect.value) {
            case 'rating-desc':
                filteredRegistrars.sort((a, b) => b.rating - a.rating);
                break;
            case 'rating-asc':
                filteredRegistrars.sort((a, b) => a.rating - b.rating);
                break;
            case 'name-asc':
                filteredRegistrars.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filteredRegistrars.sort((a, b) => b.name.localeCompare(a.name));
                break;
        }
        
        renderRegistrarList(filteredRegistrars);
    }
    
    // Add event listeners for sorting and filtering
    sortSelect.addEventListener('change', updateRegistrarList);
    filterSelect.addEventListener('change', updateRegistrarList);
    
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
    
    // Initial render
    updateRegistrarList();
});