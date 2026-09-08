import {useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import {CardHolderVerificationSample} from './advanced/CardHolderVerificationSample';
import {MerchantPaySample} from './advanced/MerchantPaySample';
import {UpdateOrderSample} from './advanced/UpdateOrderSample';
import {MenuScreen, type MenuDestination} from './MenuScreen';
import {PlaygroundScreen} from './playground/PlaygroundScreen';
import {PaymentElementSample} from './samples/PaymentElementSample';
import {PaymentSheetSample} from './samples/PaymentSheetSample';
import {WalletPaySample} from './samples/WalletPaySample';
import {brands} from './scenarios/MerchantModels';
import {MerchantStore} from './scenarios/MerchantStore';
import {ExampleThemeProvider, useExampleTheme} from './theme/ExampleTheme';

type Route = {name: 'menu'} | {name: MenuDestination};

function Root() {
  const {dark, colors} = useExampleTheme();
  const [route, setRoute] = useState<Route>({name: 'menu'});
  const back = () => setRoute({name: 'menu'});

  return (
    <SafeAreaView style={[styles.fill, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {route.name === 'menu' ? (
        <MenuScreen onOpen={(destination) => setRoute({name: destination})} />
      ) : null}
      {route.name === 'sheet' ? <PaymentSheetSample onBack={back} /> : null}
      {route.name === 'element' ? <PaymentElementSample onBack={back} /> : null}
      {route.name === 'wallet' ? (
        <WalletPaySample
          onBack={back}
          onPayWithCard={() => setRoute({name: 'element'})}
        />
      ) : null}
      {route.name === 'lumen' ? (
        <MerchantStore brand={brands.lumen} onLeave={back} />
      ) : null}
      {route.name === 'hearth' ? (
        <MerchantStore brand={brands.hearth} onLeave={back} />
      ) : null}
      {route.name === 'pulse' ? (
        <MerchantStore brand={brands.pulse} onLeave={back} />
      ) : null}
      {route.name === 'merchantPay' ? <MerchantPaySample onBack={back} /> : null}
      {route.name === 'updateOrder' ? <UpdateOrderSample onBack={back} /> : null}
      {route.name === 'chv' ? (
        <CardHolderVerificationSample onBack={back} />
      ) : null}
      {route.name === 'playground' ? <PlaygroundScreen onBack={back} /> : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ExampleThemeProvider>
      <Root />
    </ExampleThemeProvider>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
});
