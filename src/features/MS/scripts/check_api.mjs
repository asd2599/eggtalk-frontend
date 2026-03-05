import axios from 'axios';

const subwayApiKey = process.env.VITE_SUBWAY_API_KEY; // .env의 VITE_SUBWAY_API_KEY 참조
const lineName = '1호선';

async function checkApi() {
  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${subwayApiKey}/json/realtimePosition/0/20/${encodeURIComponent(lineName)}`;
    const res = await axios.get(url);
    console.log('Status:', res.status);
    console.log('Data Type:', typeof res.data);
    console.log('Realtime List:', !!res.data.realtimePositionList);
    if (res.data.realtimePositionList) {
      console.log('Count:', res.data.realtimePositionList.length);
      console.log('Sample:', res.data.realtimePositionList[0]?.statnNm);
    } else {
      console.log('FULL DATA:', JSON.stringify(res.data, null, 2));
    }
  } catch (e) {
    console.error('API ERR:', e.message);
  }
}

checkApi();
