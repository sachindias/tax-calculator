import {Route, Routes} from 'react-router-dom'
import Home from '@views/Home/Home'
import ROUTES from '@/constants/Routes'

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path={ROUTES.HOME.fullPath} element={<Home />} />
      </Routes>
    </>
  )
}

export default AppRoutes;