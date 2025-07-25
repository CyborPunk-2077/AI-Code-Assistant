// This is a test file with some intentional issues to test our Gemini commands

interface Item {
    name: string;
    price: number;
}

// Function with a bug - missing return type and has a logic error
function calculateTotal(items: Item[]): number {
    let total = 0;
    for (let i = 0; i <= items.length; i++) {  // Bug: should be < instead of <=
        total += items[i].price;  // Bug: will cause undefined error
    }
    return total;
}

// Class with some design issues
class ShoppingCart {
    private items: Item[];

    constructor() {
        this.items = [];  // Now properly typed
    }

    addItem(item: Item): void {
        this.items.push(item);  // Bug: no validation
    }

    removeItem(index: number): void {
        this.items.splice(index, 1);  // Bug: no bounds checking
    }

    getTotal(): number {
        return calculateTotal(this.items);  // Bug: using the buggy function
    }
}

// Example usage with some issues
const cart = new ShoppingCart();
cart.addItem({ name: "Book", price: 20 });
cart.addItem({ name: "Pen", price: 5 });
console.log("Total:", cart.getTotal());  // Will cause an error

// TODO: Add proper error handling
// TODO: Add input validation
// TODO: Add proper TypeScript types 