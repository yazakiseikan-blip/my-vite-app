import OrderForm from './components/OrderForm'
import GanttView from './components/GanttView'
import OrderList from './components/OrderList'
import { useStore } from './store/useStore'
import TabletView from './TabletView'

export default function App() {

  const screenMode = useStore(s => s.screenMode)

  return (
    <div>
      {screenMode === 'input' && <OrderForm />}
      {screenMode === 'gantt' && <GanttView />}
      {screenMode === 'orderlist' && <OrderList />}
      {screenMode === 'tablet' && <TabletView />}
    </div>
  )
}
