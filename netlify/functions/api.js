const GAS_URL = 'https://script.google.com/macros/s/AKfycbzM2dxFKY4i4jkzjlTIiaT05eG1LKC0UTm_foW50ahEy1aOXPXzH63kNtdmh7wks60t/exec';

exports.handler = async (event) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: event.body,
      redirect: 'follow'
    });

    const text = await response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.toString() })
    };
  }
};
