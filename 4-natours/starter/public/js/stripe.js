import axios from 'axios';
import { showAlert } from './alerts.js';
const stripe = Stripe(
  'pk_test_51MxXGOALocTnWRHVzQNR9JjCvkq8eGhGTEEEt65V9gHc1oI74s0xBr5CHrJsSXSZa5ygh7cyXHJNk2RQmBteHqvD00NixabKca'
);

export const bookTour = async (tourId) => {
  try {
    // get session from server
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    console.log(session);

    // create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
