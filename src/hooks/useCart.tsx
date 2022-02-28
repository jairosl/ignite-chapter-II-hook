import { 
  createContext, 
  ReactNode, 
  useContext, 
  useState, 
  useEffect 
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const setLocalStorage = async (product: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(product))
  }

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyAdded = cart.filter(p => p.id === productId)[0];

      const { data: stockProduct } = await api(`/stock/${productId}`);

      if(!stockProduct) {
        return;
      }
      
      if (!productAlreadyAdded) {
        const {data: newProduct} = await api(`/products/${productId}`);
        
        if(!newProduct) {
          return;
        }

        const newCarts = [...cart,  {...newProduct, amount: 1}]
        setCart(newCarts)
        setLocalStorage(newCarts)
        return;
        
      }

      if (productAlreadyAdded.amount >= stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const ProductIncrementAmount = cart.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            amount: p.amount + 1,
          }
        }
        return p
      });

      setCart(ProductIncrementAmount)
      setLocalStorage(ProductIncrementAmount)

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      
      const productAlreadyExists = cart.filter(p => p.id === productId)[0];
      
      if (!productAlreadyExists) {
        throw Error()
      }

      const filterByRemoveProduct = cart.filter(p => p.id !== productId);

      setCart(filterByRemoveProduct);
      setLocalStorage(filterByRemoveProduct)

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      
      const { data: stockProduct } = await api(`/stock/${productId}`);

      if(!stockProduct) return;

      const product = cart.filter(p => p.id === productId)[0];
      
      if(!product) return;

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const filterByUpdateAmountProduct = cart.map(product => {
        if(product.id === productId) {
          return {
            ...product,
            amount,
          }
        }
        return product
      })

      setCart(filterByUpdateAmountProduct);
      setLocalStorage(filterByUpdateAmountProduct)
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
