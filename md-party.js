// Utility methods
Vue.mixin({methods: {
    toPath:     str => str.replace(/[^a-z0-9]+/i, '_'),
    hashPage:   ()  => window.location.hash.substr(1), // 0: #
}})

// Let's get the party started!
new Vue({
    name: 'MDParty',
    el: '#app',

    template: `
        <p v-if="loading" id="message">Loading...</p>
        <div v-else id="md-party">

            <header v-if="layout.header" v-html="layout.header.html"></header>

            <nav>
                <label for="nav-burger" id="nav-burger-icon">&#9776;</label>
                <input type="checkbox" id="nav-burger">
                <span id="nav-title">{{ config.title }}</span>

                <div id="nav-items">
                    <a
                        v-for="page in sitemap"
                        :key="page"
                        :href="'#' + toPath(page)"
                        :class="{'nav-item': true, active: toPath(page) === hashPage()}"
                    >{{ page }}</a>
                </div>
            </nav>

            <main v-if="pages[page]" v-html="pages[page].html"></main>
            <p v-else id="message">Page not found</p>

            <footer v-if="layout.footer" v-html="layout.footer.html"></footer>
        </div>
    `,

    data() { return {
        config: {},
        pages: {},
        sitemap: [],
        page: undefined,
        layout: {},
        loading: true,
    }},

    methods: {

        addCSSFile() {
            const lo = this.config.layout;
            if (lo.css) {
                const style = document.createElement('link');
                style.rel   = 'stylesheet';
                style.href  = lo.fetchPrefix + '/' + lo.css;
                document.head.append(style);
            }
        },

        pathName(p) {
            return this.sitemap.find(n => this.toPath(n) === p);
        },

        syncPage() {
            this.page = this.pathName(this.hashPage()) || 'Not found';
            document.title = this.page + ' - ' + this.config.title;
            const navCheck = document.getElementById('nav-burger');
            if (navCheck) navCheck.checked = false;
        },

        loadConfigFile() {
            return fetch('config.json')
                .then(res => res.json())
        },

        loadSiteMap() {
            return fetch(this.config.pages.sitemapYaml)
                .then(res => res.text())
                .then(yaml => jsyaml.load(yaml));
        },

        // expects an array of {name, url}
        loadMarkdownResources(urls) {
            return Promise.all(urls.map(url => {
                return fetch(url.url)
                    .then(res => res.text())
                    .then(md => ({name: url.name, html: marked(md)}));
            }))
                .then(results => results.map(data => [data.name, data]))
                .then(pairs => Object.fromEntries(new Map(pairs)));
        },

        loadPages() {
            const ps = this.config.pages;
            return this.loadMarkdownResources(this.sitemap.map(name => ({
                name: name,
                url: ps.fetchPrefix + '/' + this.toPath(name) + '.md',
            })));
        },

        loadLayout() {
            const lo = this.config.layout;
            return this.loadMarkdownResources(lo.parts.map(part => ({
                name: part,
                url: lo.fetchPrefix + '/' + part + '.md',
            })));
        },
    },

    async created() {
        this.config     = await this.loadConfigFile();
        this.sitemap    = await this.loadSiteMap();
        this.pages      = await this.loadPages();
        this.layout     = await this.loadLayout();
        this.addCSSFile();
        this.loading = false;

        // Set up "navigation"
        window.addEventListener('hashchange', this.syncPage);
        this.syncPage();

        // Go to home page (first page of the sitemap)
        if (! this.hashPage())
            window.location.hash = '#' + this.toPath(this.sitemap[0]);
    },
})
