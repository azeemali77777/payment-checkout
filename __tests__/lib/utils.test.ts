import {
  cn,
  formatCurrency,
  calculateCartTotals,
  debounce,
  generateTransactionId,
  simulateNetworkDelay,
  generateMockCart,
} from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    test('should combine class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    test('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    test('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end')
    })

    test('should handle empty input', () => {
      expect(cn()).toBe('')
    })
  })

  describe('formatCurrency', () => {
    test('should format USD currency by default', () => {
      expect(formatCurrency(99.99)).toBe('$99.99')
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    test('should format different currencies', () => {
      expect(formatCurrency(99.99, 'EUR')).toBe('€99.99')
      expect(formatCurrency(99.99, 'GBP')).toBe('£99.99')
    })

    test('should handle zero and negative amounts', () => {
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(-50.25)).toBe('-$50.25')
    })

    test('should handle large amounts', () => {
      expect(formatCurrency(1000000.99)).toBe('$1,000,000.99')
    })

    test('should handle decimal precision', () => {
      expect(formatCurrency(99.1)).toBe('$99.10')
      expect(formatCurrency(99)).toBe('$99.00')
    })
  })

  describe('calculateCartTotals', () => {
    test('should calculate totals for simple cart', () => {
      const items = [
        { price: 50.00, quantity: 1 },
        { price: 25.00, quantity: 2 },
      ]

      const totals = calculateCartTotals(items)

      expect(totals.subtotal).toBe(100.00)
      expect(totals.tax).toBe(8.00) // 8% of 100
      expect(totals.shipping).toBe(0) // Free shipping over $50
      expect(totals.total).toBe(108.00)
    })

    test('should apply shipping fee for orders under $50', () => {
      const items = [
        { price: 25.00, quantity: 1 },
      ]

      const totals = calculateCartTotals(items)

      expect(totals.subtotal).toBe(25.00)
      expect(totals.tax).toBe(2.00) // 8% of 25
      expect(totals.shipping).toBe(9.99)
      expect(totals.total).toBe(36.99)
    })

    test('should handle empty cart', () => {
      const totals = calculateCartTotals([])

      expect(totals.subtotal).toBe(0)
      expect(totals.tax).toBe(0)
      expect(totals.shipping).toBe(9.99) // Still charge shipping for empty cart
      expect(totals.total).toBe(9.99)
    })

    test('should handle multiple quantities', () => {
      const items = [
        { price: 10.00, quantity: 5 },
        { price: 15.00, quantity: 3 },
      ]

      const totals = calculateCartTotals(items)

      expect(totals.subtotal).toBe(95.00) // (10*5) + (15*3)
      expect(totals.tax).toBe(7.60) // 8% of 95
      expect(totals.shipping).toBe(0) // Free shipping over $50
      expect(totals.total).toBe(102.60)
    })

    test('should round to 2 decimal places', () => {
      const items = [
        { price: 33.33, quantity: 1 },
        { price: 33.33, quantity: 1 },
        { price: 33.34, quantity: 1 },
      ]

      const totals = calculateCartTotals(items)

      expect(totals.subtotal).toBe(100.00)
      expect(totals.tax).toBe(8.00)
      expect(totals.total).toBe(108.00)
    })

    test('should handle decimal prices correctly', () => {
      const items = [
        { price: 19.99, quantity: 1 },
        { price: 29.99, quantity: 1 },
      ]

      const totals = calculateCartTotals(items)

      expect(totals.subtotal).toBe(49.98)
      expect(totals.tax).toBe(4.00) // Rounded
      expect(totals.shipping).toBe(9.99)
      expect(totals.total).toBe(63.97)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('should delay function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(300)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    test('should cancel previous calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')

      jest.advanceTimersByTime(300)
      
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('third')
    })

    test('should handle multiple arguments', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('arg1', 'arg2', 'arg3')
      jest.advanceTimersByTime(300)

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
    })

    test('should work with different wait times', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 500)

      debouncedFn('test')
      jest.advanceTimersByTime(400)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalled()
    })
  })

  describe('generateTransactionId', () => {
    test('should generate unique transaction IDs', () => {
      const id1 = generateTransactionId()
      const id2 = generateTransactionId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^txn_[a-z0-9]+_[a-z0-9]+$/)
      expect(id2).toMatch(/^txn_[a-z0-9]+_[a-z0-9]+$/)
    })

    test('should have consistent format', () => {
      const id = generateTransactionId()
      const parts = id.split('_')

      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe('txn')
      expect(parts[1]).toMatch(/^[a-z0-9]+$/) // timestamp part
      expect(parts[2]).toMatch(/^[a-z0-9]+$/) // random part
    })

    test('should generate multiple unique IDs', () => {
      const ids = Array.from({ length: 100 }, () => generateTransactionId())
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(100) // All should be unique
    })
  })

  describe('simulateNetworkDelay', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('should resolve after default delay', async () => {
      const promise = simulateNetworkDelay()
      let resolved = false

      promise.then(() => {
        resolved = true
      })

      expect(resolved).toBe(false)
      jest.advanceTimersByTime(2000)
      
      await promise
      expect(resolved).toBe(true)
    })

    test('should resolve after custom delay', async () => {
      const promise = simulateNetworkDelay(1000)
      let resolved = false

      promise.then(() => {
        resolved = true
      })

      jest.advanceTimersByTime(999)
      expect(resolved).toBe(false)

      jest.advanceTimersByTime(1)
      await promise
      expect(resolved).toBe(true)
    })

    test('should return a promise that resolves to undefined', async () => {
      jest.useFakeTimers()
      const promise = simulateNetworkDelay(100)
      jest.advanceTimersByTime(100)
      const result = await promise
      expect(result).toBeUndefined()
      jest.useRealTimers()
    })
  })

  describe('generateMockCart', () => {
    test('should generate a valid cart structure', () => {
      const cart = generateMockCart()

      expect(cart).toHaveProperty('items')
      expect(cart).toHaveProperty('subtotal')
      expect(cart).toHaveProperty('tax')
      expect(cart).toHaveProperty('shipping')
      expect(cart).toHaveProperty('total')

      expect(Array.isArray(cart.items)).toBe(true)
      expect(cart.items.length).toBeGreaterThan(0)
    })

    test('should have valid item structure', () => {
      const cart = generateMockCart()

      cart.items.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('price')
        expect(item).toHaveProperty('quantity')
        expect(item).toHaveProperty('image')

        expect(typeof item.id).toBe('string')
        expect(typeof item.name).toBe('string')
        expect(typeof item.price).toBe('number')
        expect(typeof item.quantity).toBe('number')
        expect(item.price).toBeGreaterThan(0)
        expect(item.quantity).toBeGreaterThan(0)
      })
    })

    test('should calculate totals correctly', () => {
      const cart = generateMockCart()
      
      const expectedSubtotal = cart.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      )

      expect(cart.subtotal).toBeCloseTo(expectedSubtotal, 2)
      expect(cart.tax).toBeCloseTo(expectedSubtotal * 0.08, 2)
      
      const expectedShipping = expectedSubtotal > 50 ? 0 : 9.99
      expect(cart.shipping).toBe(expectedShipping)
      
      const expectedTotal = cart.subtotal + cart.tax + cart.shipping
      expect(cart.total).toBeCloseTo(expectedTotal, 2)
    })

    test('should generate consistent data', () => {
      const cart1 = generateMockCart()
      const cart2 = generateMockCart()

      // Should have same structure but potentially different calculated values
      expect(cart1.items).toEqual(cart2.items)
      expect(cart1.subtotal).toBe(cart2.subtotal)
      expect(cart1.tax).toBe(cart2.tax)
      expect(cart1.shipping).toBe(cart2.shipping)
      expect(cart1.total).toBe(cart2.total)
    })

    test('should have realistic product data', () => {
      const cart = generateMockCart()

      expect(cart.items).toEqual([
        {
          id: '1',
          name: 'Wireless Bluetooth Headphones',
          price: 79.99,
          quantity: 1,
          image: '/images/headphones.svg'
        },
        {
          id: '2',
          name: 'USB-C Charging Cable',
          price: 19.99,
          quantity: 2,
          image: '/images/cable.svg'
        },
        {
          id: '3',
          name: 'Laptop Stand',
          price: 49.99,
          quantity: 1,
          image: '/images/laptop-stand.svg'
        }
      ])
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('calculateCartTotals should handle zero prices', () => {
      const items = [
        { price: 0, quantity: 1 },
        { price: 50, quantity: 1 },
      ]

      const totals = calculateCartTotals(items)
      expect(totals.subtotal).toBe(50)
      expect(totals.total).toBeGreaterThan(0)
    })

    test('calculateCartTotals should handle zero quantities', () => {
      const items = [
        { price: 50, quantity: 0 },
        { price: 25, quantity: 2 },
      ]

      const totals = calculateCartTotals(items)
      expect(totals.subtotal).toBe(50) // Only second item counts
    })

    test('debounce should handle function that throws error', () => {
      jest.useFakeTimers()
      
      const errorFn = jest.fn(() => {
        throw new Error('Test error')
      })
      const debouncedFn = debounce(errorFn, 100)

      // The debounced function should not throw immediately
      expect(() => debouncedFn()).not.toThrow()
      
      // After the delay, the function should be called
      jest.advanceTimersByTime(100)
      
      expect(errorFn).toHaveBeenCalled()
      
      jest.useRealTimers()
    })

    test('formatCurrency should handle very small amounts', () => {
      expect(formatCurrency(0.01)).toBe('$0.01')
      expect(formatCurrency(0.001)).toBe('$0.00') // Rounds to nearest cent
    })

    test('formatCurrency should handle invalid currency codes gracefully', () => {
      // This will throw for invalid currency codes, which is expected behavior
      expect(() => formatCurrency(99.99, 'INVALID')).toThrow()
    })
  })
})


