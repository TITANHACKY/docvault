import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        redirect: {
            destination: "/docs",
            permanent: false,
        },
    };
};

export default function HomeRedirect() {
    return null;
}
