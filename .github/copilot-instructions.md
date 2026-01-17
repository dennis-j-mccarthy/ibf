# Ignatius Book Fairs - Project Instructions

## Project Overview
This is a Next.js 14 website for Ignatius Book Fairs, a partnership between Ave Maria University and Ignatius Press that provides quality book fairs to schools, parishes, and other organizations.

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Package Manager**: npm

## Project Structure
```
src/
├── app/
│   ├── about/          # About page
│   ├── faqs/           # FAQs page
│   ├── press-room/     # Press Room page
│   ├── terms-of-service/ # Terms of Service page
│   ├── globals.css     # Global styles and CSS variables
│   ├── layout.tsx      # Root layout with Header and Footer
│   └── page.tsx        # Homepage
├── components/
│   ├── Header.tsx      # Navigation header
│   ├── Footer.tsx      # Site footer
│   ├── Hero.tsx        # Homepage hero section
│   ├── WhyHost.tsx     # Why host a book fair section
│   ├── InquiryForm.tsx # Book fair inquiry form
│   ├── Testimonials.tsx # Customer testimonials carousel
│   └── FAQSection.tsx  # FAQ accordion component
```

## Design System

### Color Palette
- Primary (Burgundy): `#8b2332`
- Primary Dark: `#6d1c28`
- Secondary (Gold): `#d4af37`
- Accent (Navy): `#2e4057`
- Light Background: `#f8f5f0`

### CSS Variables
All colors are defined as CSS custom properties in `globals.css` and can be accessed via `var(--color-name)`:
- `--primary`
- `--primary-dark`
- `--secondary`
- `--accent`
- `--light-bg`

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features
1. **Responsive Design**: Mobile-first approach with responsive navigation
2. **Inquiry Form**: Interactive form for book fair inquiries
3. **Testimonials Carousel**: Rotating testimonials from satisfied customers
4. **FAQ Accordion**: Expandable FAQ sections
5. **Timeline**: Visual timeline on the About page

## External Links
- Shop: https://shop.ignatiusbookfairs.com/
- Donations: https://afvapnqh.donorsupport.co/page/ibf

## Notes for Development
- Images are placeholders - replace with actual images
- Form submissions currently simulated - integrate with backend
- Consider adding analytics tracking
- SEO metadata is configured but can be enhanced
