import { HashRouter, Route, Routes } from 'react-router'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HowBreedingWorksPage } from './pages/HowBreedingWorksPage'
import { PlannerPage } from './pages/PlannerPage'
import { TreePage } from './pages/TreePage'

function App() {
  return (
    <HashRouter>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-4">
        <Routes>
          <Route index element={<TreePage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/how-breeding-works" element={<HowBreedingWorksPage />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  )
}

export default App
