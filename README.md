# Agharti Esplorazioni

A responsive website for a professional hiking guide operating in the Aspromonte and Serre mountain regions of Calabria, Italy.

The site serves as both a public showcase for the guide's hiking activities, and as a blog powered by Supabase.

## Features

* Responsive design for desktop and mobile devices
* Presentation of the guide and hiking activities
* Excursions section with image gallery
* Blog section for articles
* Supabase authentication for administrators
* Admin panel for creating and deleting posts
* Multi-image upload support
* Image carousel with touch swipe navigation
* Full-screen image viewer
* Contacts and social media integration

## Technologies

* HTML5
* CSS3
* Vanilla JavaScript
* Supabase

  * Authentication
  * Database
  * Storage
* Font Awesome
* Google Fonts

## Project Structure

project-root/
│
├── html/
│   └── index.html      # Main application page
│
├── css/
│   └── style.css       # Website styling
│
├── js/
│   └── app.js          # Application logic
│
├── README_EN.md
├── README_IT.md


## Supabase Setup

The website requires:

* A Supabase project
* A `posts` table
* A public Storage bucket named `images`
* Authentication enabled for administrators

## Security

Security is handled through ensuring that Row Level Security (RLS) is enabled and configured appropriately.

## Deployment

The current production deployment is hosted through Vercel.
