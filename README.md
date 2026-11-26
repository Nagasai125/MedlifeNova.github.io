# Medlife NoVA

Jekyll generates the site served at `medlifenova.org`. Edit the source pages, not the generated `_site/` folder.

## Preview

With Ruby and Bundler installed, run these commands from this directory:

```sh
bundle install
bundle exec jekyll serve --port 4137
```

Open <http://localhost:4137>. Reuse the existing preview on port 4137; do not start additional previews on other ports. Use `bundle exec jekyll build` for a one-time build. For GitHub Pages branch publishing, select the repository root as the source and keep `CNAME` in place.

## Cloudflare Pages

Deploy the generated site, not the Liquid source files. For a Git-connected Pages project, use these build settings:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `bundle exec jekyll build --baseurl ''` |
| Build output directory | `_site` |
| Environment | `JEKYLL_ENV=production` |
| GitHub repository | `PAGES_REPO_NWO=Nagasai125/MedlifeNova.github.io` |
| Ruby version | `RUBY_VERSION=3.3.4` (matches the validated local Docker build) |

Commit the source pages, `_data`, `_includes`, `_layouts`, `assets`, `_config.yml`, and `Gemfile` before a Git-connected deployment. Select the branch containing those changes as the production branch. A direct upload instead needs the contents of a completed production build; uploading this repository without building leaves Liquid templates unrendered.

For dashboard upload, choose Workers & Pages → Create application → Pages → Drag and drop, then upload the production folder or a ZIP with `index.html` at its root. Dashboard uploads allow 1,000 files. A Direct Upload project cannot later switch to Git integration; automatic Git deployments require a separate Git-integrated project. See [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

Verify the project's `pages.dev` URL before attaching `medlifenova.org` and `www.medlifenova.org` in Pages → Custom domains. Changing the registrar's nameservers activates Cloudflare DNS; it does not publish the website. Preserve existing DNS records, including email records, during the nameserver change. Keep the existing hosting available until both custom hostnames serve the new site with valid HTTPS.

Cloudflare Pages allows up to 20,000 files on the Free plan and 25 MiB per asset. See the official [Jekyll migration guide](https://developers.cloudflare.com/pages/migrations/migrating-jekyll-from-github-pages/) and [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## Make a change

- **Images:** put photos, logos and flyers in `assets/images/`. For an event flyer, set `image: /assets/images/your-flyer.jpg` in `_data/events.yml`. For a page image, use `src="{{ '/assets/images/your-photo.jpg' | relative_url }}"` and describe the image in its `alt` attribute. The browser icon stays at `/favicon.ico`.

- **Team portraits:** `_data/members.yml` records the original links in `photo_source`. Aniketh's card temporarily uses the MEDLIFE group photo, labeled through `photo_caption`; it is not an identified individual portrait. The first, third, and fifth cards use stock photos by Vitaly Gariev, and the fourth uses a photo by Jurica Koletić, under the [Unsplash License](https://unsplash.com/license). Replace `photo` with the member's actual image, update the source and `photo_alt`, and remove `photo_placeholder` or `photo_caption` to hide the temporary label.

- **Navigation or footer:** edit `_includes/header.html` or `_includes/footer.html`. The same menu serves desktop and mobile. `_layouts/default.html` loads shared assets from `assets/`; the homepage alone loads `home.css` and `home.js`.
- **Edition galleries:** `_data/gallery.yml` holds each edition's title, month, original Drive folder, and photo list. Each edition has a page in `pages/gallery/` using `_layouts/gallery-album.html`. Photos and smaller thumbnails are stored in `assets/images/gallery/<edition>/`, so visitors browse entirely on the site. The viewer supports previous/next, arrow keys, Escape, and focus restoration; photo links still open the image if JavaScript is disabled. To add photos, import them from the source folder as browser-compatible JPEGs (up to 1600px), create thumbnails (up to 640px), and append their paths, dimensions, alt text, and Drive file IDs to the data. This is a snapshot, not automatic Drive synchronization. Robotics Mentoring currently has an empty source folder; Coat Drive has no source link yet.
- **Events:** append an entry like the example below to `_data/events.yml`. Each `status: upcoming` entry becomes a calendar banner in the homepage’s `#events` section after the next build. Use a quoted `YYYY-MM-DD` date for the month/day badge. Omit optional fields such as `image` or `url` when unavailable. Change `status` to `past` to archive the event and hide registration.

```yaml
- title: Community Volunteer Day
  status: upcoming
  date: '2027-04-17'
  time: '10:00 AM–1:00 PM ET'
  venue: Community Center
  address: '123 Example Street, Ashburn, VA'
  image: /assets/images/your-flyer.jpg
  description: Meet the team and volunteer with your neighbors.
  url: https://example.org/register
  action: Register
```
- **Page content:** edit `index.html` for the homepage and `pages/` for all other pages. To add a page, create an HTML file under `pages/` with the front matter below, followed by its content. Set `permalink` to the URL visitors should use: for example, `pages/gallery.html` is served at `/gallery.html`. The layout supplies the header, main landmark and footer. Use `{{ '/path/to/file' | relative_url }}` for site links that must work from nested directories.

```yaml
---
layout: default
title: Page title - Medlife NoVA
permalink: /your-page.html
---
```

## Cloudflare contact email

The Cloudflare integration is staged, not activated. Until `_data/contact.yml` is enabled with a real Turnstile site key, the form continues posting to FormSubmit. The Pages Function at `functions/api/contact.js` only accepts verified contact submissions from the production domains and always sends to `medlifenorthernva@gmail.com`. The sender is `contact@medlifenova.org`; Reply-To is the visitor's validated address. It does not create a mailbox or send automatic replies to visitors.

Activation steps:

1. Activate the domain on Cloudflare DNS. Onboard `medlifenova.org` under Email Service → Email Sending and verify its authentication records. Add and verify `medlifenorthernva@gmail.com` under Destination Addresses.
2. Create a managed Turnstile widget allowing `medlifenova.org`, `www.medlifenova.org`, and `medlifenova.pages.dev`. Store its secret as `TURNSTILE_SECRET_KEY` in the Pages project's production secrets.
3. Create an API token scoped to this account's **Email Sending: Edit** permission. Store it only as the Pages production secret `CLOUDFLARE_EMAIL_API_TOKEN`. Add production variables `CLOUDFLARE_ACCOUNT_ID=9d3bf5e7b39c263b13b5885b18b3cac7` and `CONTACT_EMAIL_ENABLED=true`. Do not put credentials in Git, Jekyll data, or browser code. Leave preview environments without sending credentials.
4. Set the public widget key and `cloudflare_enabled: true` in `_data/contact.yml`, then deploy through the GitHub PR workflow. Pages compiles `functions/` separately; Jekyll excludes server code and tests from public static files.
5. Verify one explicitly authorized contact submission reaches the Gmail inbox before calling setup complete. Check Cloudflare Email Sending activity for delivery; an API acceptance or queued result alone does not confirm inbox delivery.

Run `node --test tests/contact.test.mjs` for validation, spam checks, recipient restrictions, and provider failure cases. These tests mock external APIs and send no email. Cloudflare's [Email Sending guide](https://developers.cloudflare.com/email-service/get-started/send-emails/) and [Turnstile validation guide](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) describe the required account setup.
