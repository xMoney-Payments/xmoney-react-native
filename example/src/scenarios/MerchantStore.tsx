import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PaymentElement,
  usePaymentSheet,
  type PaymentElementRef,
  type PaymentIntent,
  type PaymentResult,
} from '@xmoney/react-native';
import {DemoCheckoutBackend} from '../backend/DemoCheckoutBackend';
import {
  bindFailureMessage,
  defaultPaymentConfig,
  formatMoney,
  isNativeBoundEvent,
  orderConsumed,
} from '../SampleHelpers';
import {ExampleRadii} from '../theme/ExampleColors';
import {ExampleThemeProvider, useExampleTheme} from '../theme/ExampleTheme';
import {
  ExampleButton,
  ExampleCard,
  ExampleLoader,
  ExampleResultPanel,
  ExampleStatusChip,
  ExampleTopBar,
  MerchantReadyGate,
} from '../ui/ExampleComponents';
import {IconBag, IconMinus, IconPlus} from '../ui/ExampleIcons';
import {
  itemCount,
  subtotalMinor,
  toLines,
  type MerchantBrand,
  type MerchantLine,
} from './MerchantModels';

type Route =
  | {name: 'catalog'}
  | {name: 'cart'}
  | {name: 'checkout'}
  | {name: 'receipt'; result: PaymentResult};

export function MerchantStore({
  brand,
  onLeave,
}: {
  brand: MerchantBrand;
  onLeave: () => void;
}) {
  return (
    <ExampleThemeProvider
      accent={brand.accent}
      onAccent={brand.onAccent}
      accentText={brand.accentText}>
      <MerchantStoreInner brand={brand} onLeave={onLeave} />
    </ExampleThemeProvider>
  );
}

function MerchantStoreInner({
  brand,
  onLeave,
}: {
  brand: MerchantBrand;
  onLeave: () => void;
}) {
  const {colors} = useExampleTheme();
  const [route, setRoute] = useState<Route>({name: 'catalog'});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const lines = useMemo(
    () => toLines(brand.products, quantities),
    [brand.products, quantities]
  );
  const setQty = (id: string, qty: number) => {
    setQuantities((current) => {
      const next = {...current};
      if (qty <= 0) {
        delete next[id];
      } else {
        next[id] = qty;
      }
      return next;
    });
  };

  return (
    <View style={[styles.fill, {backgroundColor: colors.bg}]}>
      {route.name === 'catalog' ? (
        <Catalog
          brand={brand}
          lines={lines}
          quantityOf={(id) => quantities[id] ?? 0}
          onBack={onLeave}
          onAdd={(id) => setQty(id, (quantities[id] ?? 0) + 1)}
          onOpenCart={() => setRoute({name: 'cart'})}
        />
      ) : null}
      {route.name === 'cart' ? (
        <Cart
          brand={brand}
          lines={lines}
          onBack={() => setRoute({name: 'catalog'})}
          onQty={setQty}
          onCheckout={() => setRoute({name: 'checkout'})}
        />
      ) : null}
      {route.name === 'checkout' ? (
        brand.paySurface === 'sheet' ? (
          <SheetCheckout
            brand={brand}
            lines={lines}
            onBack={() => setRoute({name: 'cart'})}
            onFinished={(result) => setRoute({name: 'receipt', result})}
          />
        ) : (
          <EmbeddedCheckout
            brand={brand}
            lines={lines}
            onQty={setQty}
            onBack={() => setRoute({name: 'cart'})}
            onFinished={(result) => setRoute({name: 'receipt', result})}
          />
        )
      ) : null}
      {route.name === 'receipt' ? (
        <Receipt
          brand={brand}
          lines={lines}
          result={route.result}
          onDone={() => {
            setQuantities({});
            setRoute({name: 'catalog'});
          }}
          onRetry={() => setRoute({name: 'checkout'})}
          onBackToCart={() => setRoute({name: 'cart'})}
        />
      ) : null}
    </View>
  );
}

function Catalog({
  brand,
  lines,
  quantityOf,
  onBack,
  onAdd,
  onOpenCart,
}: {
  brand: MerchantBrand;
  lines: MerchantLine[];
  quantityOf: (id: string) => number;
  onBack: () => void;
  onAdd: (id: string) => void;
  onOpenCart: () => void;
}) {
  const {colors} = useExampleTheme();
  const count = itemCount(lines);
  const grouped = brand.products.reduce<Record<string, typeof brand.products>>(
    (acc, product) => {
      (acc[product.category] ??= []).push(product);
      return acc;
    },
    {}
  );
  return (
    <View style={styles.fill}>
      <ExampleTopBar
        title={brand.name}
        subtitle={brand.tagline}
        onBack={onBack}
        showThemeToggle={false}
        showWordmark
        actions={<CartBadge count={count} onPress={onOpenCart} />}
      />
      <ScrollView contentContainerStyle={styles.catalog}>
        {brand.catalogStyle === 'grid' ? (
          <View style={styles.grid}>
            {brand.products.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                blurb={product.blurb}
                price={formatMoney(product.priceMinor)}
                image={product.image}
                quantity={quantityOf(product.id)}
                onAdd={() => onAdd(product.id)}
                compact
              />
            ))}
          </View>
        ) : (
          Object.entries(grouped).map(([category, products]) => (
            <View key={category} style={{gap: 12}}>
              <Text style={[styles.section, {color: colors.muted}]}>
                {category}
              </Text>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  blurb={product.blurb}
                  price={formatMoney(product.priceMinor)}
                  image={product.image}
                  quantity={quantityOf(product.id)}
                  onAdd={() => onAdd(product.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
      {count > 0 ? (
        <View style={styles.footer}>
          <ExampleButton
            label={`Cart · ${count} ${count === 1 ? 'item' : 'items'} · ${formatMoney(subtotalMinor(lines))}`}
            onPress={onOpenCart}
          />
        </View>
      ) : null}
    </View>
  );
}

function ProductCard({
  name,
  blurb,
  price,
  image,
  quantity,
  onAdd,
  compact,
}: {
  name: string;
  blurb: string;
  price: string;
  image: MerchantBrand['products'][number]['image'];
  quantity: number;
  onAdd: () => void;
  compact?: boolean;
}) {
  const {colors} = useExampleTheme();
  return (
    <View
      style={[
        styles.product,
        compact ? styles.productCompact : null,
        {backgroundColor: colors.card, borderColor: colors.hairline},
      ]}>
      <Image source={image} style={compact ? styles.photoCompact : styles.photo} />
      <View style={{gap: 4, flex: 1}}>
        <Text style={[styles.productName, {color: colors.text}]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{color: colors.muted, fontSize: 13}} numberOfLines={2}>
          {blurb}
        </Text>
        <View style={styles.row}>
          <Text style={[styles.price, {color: colors.accentText}]}>{price}</Text>
          <Pressable
            onPress={onAdd}
            style={[styles.add, {backgroundColor: colors.accent}]}>
            {quantity > 0 ? (
              <Text style={{color: colors.onAccent, fontWeight: '700'}}>
                {quantity}
              </Text>
            ) : (
              <IconPlus color={colors.onAccent} size={16} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Cart({
  brand,
  lines,
  onBack,
  onQty,
  onCheckout,
}: {
  brand: MerchantBrand;
  lines: MerchantLine[];
  onBack: () => void;
  onQty: (id: string, qty: number) => void;
  onCheckout: () => void;
}) {
  const {colors} = useExampleTheme();
  const empty = lines.length === 0;
  return (
    <View style={styles.fill}>
      <ExampleTopBar
        title="Cart"
        subtitle={empty ? 'No items yet.' : `${itemCount(lines)} items`}
        onBack={onBack}
        showThemeToggle={false}
      />
      <ScrollView contentContainerStyle={styles.pad}>
        {empty ? (
          <ExampleCard>
            <Text style={{color: colors.text, fontSize: 20, fontWeight: '700'}}>
              Your bag is empty
            </Text>
            <Text style={{color: colors.muted}}>{brand.emptyHint}</Text>
            <ExampleButton
              label="Continue shopping"
              variant="secondary"
              onPress={onBack}
            />
          </ExampleCard>
        ) : (
          <ExampleCard>
            {lines.map((line) => (
              <CartLine
                key={line.product.id}
                line={line}
                onQty={(qty) => onQty(line.product.id, qty)}
              />
            ))}
          </ExampleCard>
        )}
      </ScrollView>
      {!empty ? (
        <View style={styles.footer}>
          <Totals lines={lines} />
          <ExampleButton
            label={`Checkout · ${formatMoney(subtotalMinor(lines))}`}
            onPress={onCheckout}
          />
        </View>
      ) : null}
    </View>
  );
}

function CartLine({
  line,
  onQty,
}: {
  line: MerchantLine;
  onQty: (qty: number) => void;
}) {
  const {colors} = useExampleTheme();
  return (
    <View style={styles.cartLine}>
      <Image source={line.product.image} style={styles.thumb} />
      <View style={{flex: 1, gap: 4}}>
        <Text style={{color: colors.text, fontWeight: '600'}}>
          {line.product.name}
        </Text>
        <Text style={{color: colors.muted}}>
          {formatMoney(line.product.priceMinor)}
        </Text>
        <View style={[styles.stepper, {borderColor: colors.hairline}]}>
          <Pressable
            onPress={() => onQty(line.quantity - 1)}
            accessibilityLabel="Decrease"
            style={styles.step}>
            <IconMinus color={colors.text} size={16} />
          </Pressable>
          <Text style={{color: colors.text, fontWeight: '600'}}>
            {line.quantity}
          </Text>
          <Pressable
            onPress={() => onQty(line.quantity + 1)}
            accessibilityLabel="Increase"
            style={styles.step}>
            <IconPlus color={colors.text} size={16} />
          </Pressable>
        </View>
      </View>
      <Text style={{color: colors.text, fontWeight: '700'}}>
        {formatMoney(line.product.priceMinor * line.quantity)}
      </Text>
    </View>
  );
}

function CartBadge({count, onPress}: {count: number; onPress: () => void}) {
  const {colors} = useExampleTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Cart"
      style={styles.cartBadge}>
      <IconBag color={colors.text} size={22} />
      {count > 0 ? (
        <View style={[styles.cartCount, {backgroundColor: colors.accent}]}>
          <Text style={[styles.cartCountText, {color: colors.onAccent}]}>
            {count > 9 ? '9+' : String(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Totals({lines}: {lines: MerchantLine[]}) {
  const {colors} = useExampleTheme();
  const total = formatMoney(subtotalMinor(lines));
  return (
    <View style={{gap: 6, marginBottom: 10}}>
      <View style={styles.row}>
        <Text style={{color: colors.muted}}>Subtotal</Text>
        <Text style={{color: colors.text}}>{total}</Text>
      </View>
      <View style={styles.row}>
        <Text style={{color: colors.text, fontWeight: '700'}}>Total</Text>
        <Text style={{color: colors.text, fontWeight: '700'}}>{total}</Text>
      </View>
    </View>
  );
}

function SheetCheckout({
  brand,
  lines,
  onBack,
  onFinished,
}: {
  brand: MerchantBrand;
  lines: MerchantLine[];
  onBack: () => void;
  onFinished: (result: PaymentResult) => void;
}) {
  const {dark, colors} = useExampleTheme();
  const sheet = usePaymentSheet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [heldIntent, setHeldIntent] = useState<PaymentIntent | null>(null);
  const count = itemCount(lines);
  const description = `${brand.name} · ${count} ${count === 1 ? 'item' : 'items'}`;
  const configuration = useMemo(
    () => defaultPaymentConfig({dark, appearance: brand.appearance}),
    [brand.appearance, dark]
  );

  const onPay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const intent =
        heldIntent ??
        (await DemoCheckoutBackend.createPaymentIntent({
          amountMinor: subtotalMinor(lines),
          description,
        }));
      setHeldIntent(intent);
      await sheet.init(configuration);
      const result = await sheet.present(intent);
      setLoading(false);
      if (orderConsumed(result, result.status !== 'canceled')) {
        setHeldIntent(null);
        onFinished(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
      setLoading(false);
    }
  }, [configuration, description, heldIntent, lines, onFinished, sheet]);

  return (
    <View style={styles.fill}>
      <ExampleTopBar
        title="Checkout"
        subtitle={description}
        onBack={onBack}
        showThemeToggle={false}
        showTestCards
      />
      <ScrollView contentContainerStyle={[styles.pad, {gap: 16}]}>
        <ExampleCard>
          {lines.map((line) => (
            <View key={line.product.id} style={styles.row}>
              <Text style={{color: colors.text, flex: 1}}>
                {line.product.name} × {line.quantity}
              </Text>
              <Text style={{color: colors.text, fontWeight: '600'}}>
                {formatMoney(line.product.priceMinor * line.quantity)}
              </Text>
            </View>
          ))}
          <Totals lines={lines} />
        </ExampleCard>
        <ExampleButton
          label={`Pay · ${formatMoney(subtotalMinor(lines))}`}
          loading={loading}
          onPress={() => void onPay()}
        />
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
      </ScrollView>
    </View>
  );
}

function EmbeddedCheckout({
  brand,
  lines,
  onQty,
  onBack,
  onFinished,
}: {
  brand: MerchantBrand;
  lines: MerchantLine[];
  onQty: (id: string, qty: number) => void;
  onBack: () => void;
  onFinished: (result: PaymentResult) => void;
}) {
  const {dark, colors} = useExampleTheme();
  const elementRef = useRef<PaymentElementRef>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const total = subtotalMinor(lines);
  const count = itemCount(lines);
  const description = `${brand.name} · ${count} ${count === 1 ? 'item' : 'items'}`;
  const configuration = useMemo(
    () => defaultPaymentConfig({dark, appearance: brand.appearance}),
    [brand.appearance, dark]
  );

  useEffect(() => {
    if (lines.length === 0) {
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void (async () => {
        setError(null);
        try {
          const next = await DemoCheckoutBackend.createPaymentIntent({
            amountMinor: total,
            description,
          });
          if (cancelled) {
            return;
          }
          if (elementRef.current && intent) {
            await elementRef.current.updateOrder(next);
          }
          setIntent(next);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Could not create order');
          }
        }
      })();
    }, intent ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, description]);

  return (
    <View style={styles.fill}>
      <ExampleTopBar
        title="Checkout"
        subtitle={description}
        onBack={onBack}
        showThemeToggle={false}
        showTestCards
      />
      <ScrollView contentContainerStyle={[styles.pad, {gap: 16}]}>
        <ExampleCard>
          {lines.map((line) => (
            <CartLine
              key={line.product.id}
              line={line}
              onQty={(qty) => onQty(line.product.id, qty)}
            />
          ))}
          <Totals lines={lines} />
        </ExampleCard>
        {!intent ? (
          <ExampleLoader message="Preparing checkout…" />
        ) : (
          <MerchantReadyGate ready={ready} message="Preparing checkout…">
            <PaymentElement
              ref={elementRef}
              configuration={configuration}
              intent={intent}
              onEvent={(event) => {
                if (isNativeBoundEvent(event)) {
                  setReady(true);
                }
              }}
              onResult={(result) => {
                const bindError = bindFailureMessage(result);
                if (bindError) {
                  setError(bindError);
                  setReady(true);
                }
                if (orderConsumed(result, result.status !== 'canceled')) {
                  onFinished(result);
                }
              }}
            />
          </MerchantReadyGate>
        )}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
      </ScrollView>
    </View>
  );
}

function Receipt({
  brand,
  lines,
  result,
  onDone,
  onRetry,
  onBackToCart,
}: {
  brand: MerchantBrand;
  lines: MerchantLine[];
  result: PaymentResult;
  onDone: () => void;
  onRetry: () => void;
  onBackToCart: () => void;
}) {
  const {colors} = useExampleTheme();
  const ok = result.status === 'complete';
  return (
    <View style={styles.fill}>
      <ExampleTopBar
        title={ok ? 'Thank you' : 'Payment'}
        subtitle={brand.name}
        onBack={onBackToCart}
        showThemeToggle={false}
      />
      <ScrollView contentContainerStyle={[styles.pad, {gap: 16}]}>
        <ExampleResultPanel result={result} />
        <ExampleCard>
          {lines.map((line) => (
            <Text key={line.product.id} style={{color: colors.text}}>
              {line.product.name} × {line.quantity}
            </Text>
          ))}
        </ExampleCard>
        {ok ? (
          <ExampleButton label="Done" onPress={onDone} />
        ) : (
          <>
            <ExampleButton label="Try again" onPress={onRetry} />
            <ExampleButton
              label="Back to cart"
              variant="secondary"
              onPress={onBackToCart}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  pad: {paddingHorizontal: 20, paddingTop: 8, gap: 12},
  catalog: {paddingHorizontal: 20, paddingBottom: 120, gap: 16},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  section: {fontSize: 13, fontWeight: '700', letterSpacing: 0.6},
  product: {
    borderWidth: 1,
    borderRadius: ExampleRadii.card,
    overflow: 'hidden',
    padding: 12,
    gap: 10,
    flexDirection: 'row',
  },
  productCompact: {width: '48%', flexDirection: 'column'},
  photo: {width: 72, height: 72, borderRadius: ExampleRadii.inner},
  photoCompact: {width: '100%', height: 120, borderRadius: ExampleRadii.inner},
  productName: {fontSize: 16, fontWeight: '700'},
  price: {fontSize: 15, fontWeight: '700'},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  add: {
    minWidth: 32,
    height: 32,
    borderRadius: ExampleRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  footer: {paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8},
  cartLine: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  thumb: {width: 56, height: 56, borderRadius: ExampleRadii.inner},
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: ExampleRadii.pill,
    alignSelf: 'flex-start',
  },
  step: {paddingHorizontal: 10, paddingVertical: 4},
  cartBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCount: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartCountText: {fontSize: 10, fontWeight: '700'},
});
