export default function DemoPage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4 text-center">
        Try the Tournament Demo
      </h1>
      <p className="text-lg text-center text-gray-600 mb-8">
        See how easy it is to manage a tournament. This is a fully interactive preview – no login required.
      </p>

      {/* Example bracket or mock match UI */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Tournament Preview</h2>
        <ul className="space-y-3">
          <li>🏓 Round 1: Team A vs Team B – 3:2</li>
          <li>🏓 Round 1: Team C vs Team D – 1:3</li>
          <li>🏆 Semifinal: Team B vs Team D – Pending</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="text-gray-600 mb-4">Ready to make your own?</p>
        <a href="/create" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
          Create Your Tournament
        </a>
      </div>
    </main>
  );
}
