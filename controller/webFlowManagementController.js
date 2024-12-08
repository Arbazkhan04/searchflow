const CustomError = require("../utils/customError.js");
const responseHandler = require("../utils/responseHandler.js");
const axios = require('axios')
const qs = require('qs'); // For URL-encoding the request body

const connectWebFlowAccount =async(req,res,next)=>{
    try {

       const ClientId= process.env.WEBFLOW_CLIENT_ID;
       const redirectURI = process.env.REDIRECT_URI
console.log(redirectURI)
        const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=STATE`;


        res.redirect(302,url)

        
    } catch (error) {
        next(
            error instanceof CustomError ? error : new CustomError(error.message, 500)
          );
    }
}



const getWebFlowAccessToken =async(req,res,next)=>{
    try {

        const code= req.query?.code;
        console.log(code)
        const url= 'https://api.webflow.com/oauth/access_token';
        const ClientId= process.env.WEBFLOW_CLIENT_ID;
        const redirectURI = process.env.REDIRECT_URI;
        const clientSecret= process.env.WEBFLOW_CLIENT_SECRET;
        const redirecAfterSuccss = process.env.USERDASHBOARD_URL
            // Replace with your actual Webflow app credentials
    const data = qs.stringify({
        client_id: ClientId,
        client_secret: clientSecret,
        code: code, 
        redirect_uri: redirectURI,
        grant_type: 'authorization_code'
    });


    const response = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    // Access token response
    console.log('Access Token:', response.data.access_token);

    const userDashboard = "https://www.app-demo.store/"


    res.redirect(302,redirecAfterSuccss)

        
    } catch (error) {
        next(
            error instanceof CustomError ? error : new CustomError(error.message, 500)
          );
    }
}


module.exports ={
    connectWebFlowAccount,
    getWebFlowAccessToken
}