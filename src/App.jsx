import { useState } from 'react'
import EnquiryForm from './Pages/EnquiryForm'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <EnquiryForm />
    </>
  )
}

export default App
