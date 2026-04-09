export function success(data=null,message='success'){return{success:!0,data,message}};export function error(message,status=400){return{success:!1,error:message,status}}
