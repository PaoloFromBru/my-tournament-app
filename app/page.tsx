import Script from "next/script";

export default function Home() {
  return (
    <div className="bg-gray-50 text-gray-800 font-sans">
      {/* Hero Section */}
      <section className="bg-white py-16 px-6 md:px-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-indigo-700">
          Organize Tournaments Without the Hassle
        </h1>
        <p className="text-xl mb-6 text-gray-600">
          From babyfoot to padel, manage your tournaments like a pro.
          <br />No sign-up required to get started.
        </p>
        <a
          href="/create"
          className="bg-indigo-600 text-white py-3 px-6 rounded-lg text-lg hover:bg-indigo-700 transition"
        >
          Create your Tournament
        </a>
      </section>

      {/* Features */}
      <section className="py-16 px-6 md:px-12 bg-gray-100">
        <h2 className="text-3xl font-semibold text-center mb-10 text-indigo-700">
          Create. Share. Play.
        </h2>
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
          <ul className="space-y-4 text-lg text-gray-700">
            <li>✅ Set up a tournament in seconds</li>
            <li>✅ Add teams and players with ease</li>
            <li>✅ Automatic match scheduling — including odd team counts</li>
            <li>✅ Share real-time updates with participants</li>
            <li>✅ Works beautifully on any device</li>
          </ul>
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-lg text-gray-600 mb-4">
              Your players don’t need to download anything.
            </p>
            <p className="text-xl font-semibold text-indigo-600">
              Just share the link, and they’re in!
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 md:px-12 bg-white text-center">
        <h2 className="text-3xl font-semibold text-indigo-700 mb-10">
          What Users Say
        </h2>
        <div className="max-w-3xl mx-auto space-y-8">
          <blockquote className="italic text-gray-600">
            “We used it for our pub’s foosball night – everyone loved the live
            match updates!”
            <br />
            <span className="text-sm font-semibold text-gray-500">
              — Giulia, event organizer
            </span>
          </blockquote>
          <blockquote className="italic text-gray-600">
            “I run a local padel club and this tool saved me hours. It’s just
            intuitive.”
            <br />
            <span className="text-sm font-semibold text-gray-500">
              — Marc, club owner
            </span>
          </blockquote>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-6 md:px-12 bg-indigo-50 text-center">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6">
          Get Started Now
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          No account needed. Just click and go.
        </p>
        <a
          href="/create"
          className="bg-indigo-600 text-white py-3 px-6 rounded-lg text-lg hover:bg-indigo-700 transition"
        >
          Create Your Tournament
        </a>
      </section>

      {/* Booking Button */}
      <section className="py-16 px-6 md:px-12 bg-white text-center">
        <Script
          id="setmore_script"
          type="text/javascript"
          src="https://assets.setmore.com/integration/static/setmoreIframeLive.js"
        />
        <a
          style={{ float: "none" }}
          id="Setmore_button_iframe"
          href="https://hauben.setmore.com"
        >
          <img
            src="https://assets.setmore.com/setmore/images/2.0/Settings/book-now-black.svg"
            alt="Click here to book the appointment using setmore"
            style={{ border: "none" }}
          />
        </a>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-12 bg-gray-100">
        <h2 className="text-3xl font-semibold text-center text-indigo-700 mb-10">
          Frequently Asked Questions
        </h2>
        <div className="max-w-2xl mx-auto space-y-6 text-gray-700 text-lg">
          <div>
            <strong>Do I need to register?</strong>
            <p>
              No — you can try the app instantly. Login is optional and only
              needed to save your tournaments.
            </p>
          </div>
          <div>
            <strong>Does it cost anything?</strong>
            <p>It’s free for casual use. Premium features for clubs are coming soon.</p>
          </div>
          <div>
            <strong>What sports does it work for?</strong>
            <p>
              Any tournament format — babyfoot, padel, ping pong, board games, and
              more.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm bg-white">
        © 2025 MyTournamentApp.com – All rights reserved
      </footer>
    </div>
  );
}
