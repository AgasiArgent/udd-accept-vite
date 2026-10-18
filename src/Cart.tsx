import { useState } from 'react'

const ITEMS = [
  { id: 'coffee', name: 'Coffee beans (1 kg)', price: 18.5 },
  { id: 'mug', name: 'Ceramic mug', price: 7.25 },
  { id: 'filters', name: 'Paper filters (100)', price: 4 },
]

export default function Cart() {
  const [qty, setQty] = useState<Record<string, number>>({ coffee: 1, mug: 2, filters: 3 })

  const total = ITEMS.reduce(
    (sum, item) => sum + item.price * qty[item.id],
    0,
  )

  return (
    <table>
      <thead>
        <tr><th>Item</th><th>Price</th><th>Qty</th></tr>
      </thead>
      <tbody>
        {ITEMS.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>
              <input
                type="number"
                min={0}
                value={qty[item.id]}
                aria-label={`Quantity of ${item.name}`}
                onChange={(e) => setQty({ ...qty, [item.id]: Math.max(0, Number(e.target.value) || 0) })}
              />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><th colSpan={2}>Total</th><th data-testid="total">${total.toFixed(2)}</th></tr>
      </tfoot>
    </table>
  )
}
