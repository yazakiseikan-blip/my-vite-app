import OrderForm from './components/OrderForm'
import GanttView from './components/GanttView'
import OrderList from './components/OrderList'
import { useStore } from './store/useStore'
import TabletView from './TabletView'
import LoginView from './components/LoginView'

export default function App() {

  const screenMode = useStore(s => s.screenMode)

  return (
    <div>
      {screenMode === 'login' && <LoginView />}
      {screenMode === 'input' && <OrderForm />}
      {screenMode === 'gantt' && <GanttView />}
      {screenMode === 'orderlist' && <OrderList />}
      {screenMode === 'tablet' && <TabletView />}
    </div>
  )
}
