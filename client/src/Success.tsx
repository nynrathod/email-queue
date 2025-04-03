import { useEffect } from "react";

function Success() {
    useEffect(() => {
        localStorage.setItem("auth_success", "true");
        window.close();
    }, []);

    return null;
}

export default Success;
