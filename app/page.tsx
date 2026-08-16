"use client";

import "./landing.css";

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85",
    className: "photo photo-1",
    alt: "Landscape",
  },
  {
    src: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=85",
    className: "photo photo-2",
    alt: "Nature",
  },
  {
    src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
    className: "photo photo-3",
    alt: "Portrait",
  },
  {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
    className: "photo photo-4",
    alt: "Ocean",
  },
];

export default function Home() {
  const goToEditor = () => {
    window.location.href = "/editor";
  };

  return (
    <main className="landing-page">

      {/* =====================================================
          WINDOWS 95 TOP BAR
      ===================================================== */}

      <header className="xp-topbar">

        <nav className="xp-nav">

          <button className="nav-link">
            Home
          </button>

          <button className="nav-link">
            About
          </button>

          <button className="nav-link">
            Privacy Policy
          </button>

        </nav>

        <div className="window-controls">

          <button className="window-button">
            ?
          </button>

          <button className="window-button">
            ×
          </button>

        </div>

      </header>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="hero">

        {/* FLOATING PHOTOS */}

        <div className="photo-gallery">

          {galleryImages.map((photo) => (
            <div
              key={photo.className}
              className={`photo-frame ${photo.className}`}
            >
              <img
                src={photo.src}
                alt={photo.alt}
              />

              <div className="photo-sparkles">
                ✦
              </div>
            </div>
          ))}

        </div>


        {/* =================================================
            TOP CENTER ADS
        ================================================= */}

        <div className="top-ads">

          <div className="retro-ad large-ad">

            <span className="ad-icon">
              ▣
            </span>

            <strong>
              The app is now available on Google Play!
            </strong>

            <span className="ad-decoration">
              ★ ·¸¸. Google Play .¸¸· ★
            </span>

          </div>


          <div className="retro-ad instagram-ad">

            ★ ·¸¸. Instagram @95dani.exe .¸¸· ★

          </div>


          <div className="retro-ad pre-register-ad">

            <strong>
              ▣ Y2KCam: Pre-register now!
            </strong>

            <span>
              ★ ·¸¸. Pre-register on Google Play .¸¸· ★
            </span>

          </div>

        </div>


        {/* =================================================
            CENTER CONTENT
        ================================================= */}

        <div className="hero-content">

          <h1 className="logo">
            Photu.exe
          </h1>

          <p className="hero-message">
            ✨ For the best experience, please use the website
            <br />
            on a computer browser. ✨
          </p>

          <button
            className="edit-button"
            onClick={goToEditor}
          >
            Edit Photo
          </button>

        </div>


        {/* =================================================
            EXTRA DECORATION
        ================================================= */}

        <div className="grass-decoration grass-left" />

        <div className="grass-decoration grass-right" />

      </section>


      {/* =====================================================
          BOTTOM STATUS BAR
      ===================================================== */}

      <footer className="landing-statusbar">

        <span>
          photu.exe
        </span>

        <span>
          © 1995–2026 Image95
        </span>

      </footer>

    </main>
  );
}